// This file is a modified version of the subset-font library.
// Original author: Andreas Lind
// Original source: https://github.com/papandreou/subset-font

import { compress, decompress } from "npm:woff2-encoder@1"

interface SubsetOptions {
  targetFormat?: "woff2" | "truetype"
  preserveNameIds?: number[]
  variationAxes?: {
    [axisName: string]: number | { min: number; max: number; default?: number }
  }
  noLayoutClosure?: boolean
}

interface HarfbuzzWasm {
  memory: WebAssembly.Memory
  hb_subset_input_create_or_fail(): number
  malloc(size: number): number
  hb_blob_create(
    buffer: number,
    length: number,
    mode: number,
    user_data: number,
    destroy: number,
  ): number
  hb_face_create(blob: number, index: number): number
  hb_blob_destroy(blob: number): void
  hb_subset_input_set(input: number, set_type: number): number
  hb_set_clear(set: number): void
  hb_set_invert(set: number): void
  hb_subset_input_set_flags(input: number, flags: number): void
  hb_subset_input_get_flags(input: number): number
  hb_subset_input_unicode_set(input: number): number
  hb_set_add(set: number, value: number): void
  hb_subset_input_pin_axis_location(
    input: number,
    face: number,
    axis: number,
    value: number,
  ): number
  hb_face_destroy(face: number): void
  free(ptr: number): void
  hb_subset_input_set_axis_range(
    input: number,
    face: number,
    axis: number,
    min: number,
    max: number,
    def: number,
  ): number
  hb_subset_or_fail(face: number, input: number): number
  hb_subset_input_destroy(input: number): void
  hb_face_reference_blob(face: number): number
  hb_blob_get_data(blob: number, length: number): number
  hb_blob_get_length(blob: number): number
}

const loadAndInitializeHarfbuzz = (() => {
  let promise = null;

  return async () => {
    if (promise === null) {
      promise = (async () => {
        const wasmBuffer = await fetch(
          "https://cdn.jsdelivr.net/npm/harfbuzzjs@0.4.11/hb-subset.wasm",
        ).then((res) => res.arrayBuffer());

        const { instance: { exports: harfbuzzJsWasm } } = await WebAssembly
          .instantiate(wasmBuffer) as unknown as {
          instance: { exports: HarfbuzzWasm };
        };

        const heapu8 = new Uint8Array(harfbuzzJsWasm.memory.buffer);
        return { harfbuzzJsWasm, heapu8 };
      })();
    }
    return promise;
  };
})();

function HB_TAG(str: string): number {
  return str.split("").reduce(function (a, ch) {
    return (a << 8) + ch.charCodeAt(0)
  }, 0)
}

async function subsetFont(
  originalFont: Uint8Array,
  text: string,
  {
    targetFormat = "woff2",
    preserveNameIds,
    variationAxes,
    noLayoutClosure,
  }: SubsetOptions = {},
): Promise<Uint8Array> {
  if (typeof text !== "string") {
    throw new Error("The subset text must be given as a string")
  }
  const { harfbuzzJsWasm, heapu8 } = await loadAndInitializeHarfbuzz()

  originalFont = await decompress(originalFont)

  const input = harfbuzzJsWasm.hb_subset_input_create_or_fail()
  if (input === 0) {
    throw new Error(
      "hb_subset_input_create_or_fail (harfbuzz) returned zero, indicating failure",
    )
  }

  const fontBuffer = harfbuzzJsWasm.malloc(originalFont.byteLength)
  heapu8.set(new Uint8Array(originalFont), fontBuffer)

  // Create the face
  const blob = harfbuzzJsWasm.hb_blob_create(
    fontBuffer,
    originalFont.byteLength,
    2, // HB_MEMORY_MODE_WRITABLE
    0,
    0,
  )
  const face = harfbuzzJsWasm.hb_face_create(blob, 0)
  harfbuzzJsWasm.hb_blob_destroy(blob)

  // Do the equivalent of --font-features=*
  const layoutFeatures = harfbuzzJsWasm.hb_subset_input_set(
    input,
    6, // HB_SUBSET_SETS_LAYOUT_FEATURE_TAG
  )
  harfbuzzJsWasm.hb_set_clear(layoutFeatures)
  harfbuzzJsWasm.hb_set_invert(layoutFeatures)

  if (preserveNameIds) {
    const inputNameIds = harfbuzzJsWasm.hb_subset_input_set(
      input,
      4, // HB_SUBSET_SETS_NAME_ID
    )
    for (const nameId of preserveNameIds) {
      harfbuzzJsWasm.hb_set_add(inputNameIds, nameId)
    }
  }

  if (noLayoutClosure) {
    harfbuzzJsWasm.hb_subset_input_set_flags(
      input,
      harfbuzzJsWasm.hb_subset_input_get_flags(input) | 0x00000200, // HB_SUBSET_FLAGS_NO_LAYOUT_CLOSURE
    )
  }

  // Add unicodes indices
  const inputUnicodes = harfbuzzJsWasm.hb_subset_input_unicode_set(input)
  for (const c of text) {
    harfbuzzJsWasm.hb_set_add(inputUnicodes, c.codePointAt(0)!)
  }

  if (variationAxes) {
    for (const [axisName, value] of Object.entries(variationAxes)) {
      if (typeof value === "number") {
        // Simple case: Pin/instance the variation axis to a single value
        if (
          !harfbuzzJsWasm.hb_subset_input_pin_axis_location(
            input,
            face,
            HB_TAG(axisName),
            value,
          )
        ) {
          harfbuzzJsWasm.hb_face_destroy(face)
          harfbuzzJsWasm.free(fontBuffer)
          throw new Error(
            `hb_subset_input_pin_axis_location (harfbuzz) returned zero when pinning ${axisName} to ${value}, indicating failure. Maybe the axis does not exist in the font?`,
          )
        }
      } else if (value && typeof value === "object") {
        // Complex case: Reduce the variation space of the axis
        if (
          typeof value.min === "undefined" ||
          typeof value.max === "undefined"
        ) {
          harfbuzzJsWasm.hb_face_destroy(face)
          harfbuzzJsWasm.free(fontBuffer)
          throw new Error(
            `${axisName}: You must provide both a min and a max value when setting the axis range`,
          )
        }
        if (
          !harfbuzzJsWasm.hb_subset_input_set_axis_range(
            input,
            face,
            HB_TAG(axisName),
            value.min,
            value.max,
            // An explicit NaN makes harfbuzz use the existing default value, clamping to the new range if necessary
            value.default ?? NaN,
          )
        ) {
          harfbuzzJsWasm.hb_face_destroy(face)
          harfbuzzJsWasm.free(fontBuffer)
          throw new Error(
            `hb_subset_input_set_axis_range (harfbuzz) returned zero when setting the range of ${axisName} to [${value.min}; ${value.max}] and a default value of ${value.default}, indicating failure. Maybe the axis does not exist in the font?`,
          )
        }
      }
    }
  }

  let subset
  try {
    subset = harfbuzzJsWasm.hb_subset_or_fail(face, input)
    if (subset === 0) {
      harfbuzzJsWasm.hb_face_destroy(face)
      harfbuzzJsWasm.free(fontBuffer)
      throw new Error(
        "hb_subset_or_fail (harfbuzz) returned zero, indicating failure. Maybe the input file is corrupted?",
      )
    }
  } finally {
    // Clean up
    harfbuzzJsWasm.hb_subset_input_destroy(input)
  }

  // Get result blob
  const result = harfbuzzJsWasm.hb_face_reference_blob(subset)
  const offset = harfbuzzJsWasm.hb_blob_get_data(result, 0)
  const subsetByteLength = harfbuzzJsWasm.hb_blob_get_length(result)

  if (subsetByteLength === 0) {
    harfbuzzJsWasm.hb_blob_destroy(result)
    harfbuzzJsWasm.hb_face_destroy(subset)
    harfbuzzJsWasm.hb_face_destroy(face)
    harfbuzzJsWasm.free(fontBuffer)
    throw new Error(
      "Failed to create subset font, maybe the input file is corrupted?",
    )
  }

  const subsettedFont = new Uint8Array(
    heapu8.subarray(offset, offset + subsetByteLength),
  )

  // Clean up
  harfbuzzJsWasm.hb_blob_destroy(result)
  harfbuzzJsWasm.hb_face_destroy(subset)
  harfbuzzJsWasm.hb_face_destroy(face)
  harfbuzzJsWasm.free(fontBuffer)

  if (targetFormat === "woff2") {
    return await compress(subsettedFont)
  } else {
    return subsettedFont
  }
}

const createLimiter = () => {
  let promiseChain = Promise.resolve();

  return (fn) => {
    const result = promiseChain.then(() => fn());
    promiseChain = result.catch(() => {});
    return result;
  };
};

const limiter = createLimiter();

export default (...args: [Uint8Array, string, SubsetOptions?]) =>
  limiter(() => subsetFont(...args))
