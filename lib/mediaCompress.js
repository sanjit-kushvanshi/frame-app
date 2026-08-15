// Compress images client-side before upload (resize + re-encode as JPEG,
// iterating on quality until it fits under a target size).

const TARGET_MAX_BYTES = 200 * 1024; // 200KB
const MIN_QUALITY = 0.35; // don't go below this even if still too big

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Could not decode image"));
      img.onload = () => resolve(img);
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function canvasToBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Compression failed"))),
      "image/jpeg",
      quality
    );
  });
}

function renameToJpg(name) {
  const base = name.replace(/\.[^/.]+$/, "");
  return `${base}.jpg`;
}

export async function compressImage(file, { maxDim = 1280, targetBytes = TARGET_MAX_BYTES } = {}) {
  const img = await loadImage(file);

  let { width, height } = img;
  if (width > height && width > maxDim) {
    height = Math.round((height * maxDim) / width);
    width = maxDim;
  } else if (height > maxDim) {
    width = Math.round((width * maxDim) / height);
    height = maxDim;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, width, height);

  let quality = 0.8;
  let blob = await canvasToBlob(canvas, quality);

  // Step quality down until we're under the target size, or hit the floor.
  while (blob.size > targetBytes && quality > MIN_QUALITY) {
    quality -= 0.1;
    blob = await canvasToBlob(canvas, quality);
  }

  // If still too big at minimum quality, shrink dimensions further and retry once.
  if (blob.size > targetBytes && (width > 640 || height > 640)) {
    return compressImage(file, { maxDim: Math.round(maxDim * 0.7), targetBytes });
  }

  return new File([blob], renameToJpg(file.name), { type: "image/jpeg" });
}

// Videos: browsers can't easily re-encode video without a heavy library
// (ffmpeg.wasm etc.), so for now we pass them through as-is but block
// anything oversized so a single upload can't eat the storage quota.
export function checkVideoSize(file, maxMB = 25) {
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > maxMB) {
    return { ok: false, message: `This video is ${sizeMB.toFixed(1)}MB. Please choose one under ${maxMB}MB, or trim it first.` };
  }
  return { ok: true };
}

export async function compressForUpload(file) {
  if (file.type.startsWith("image/")) {
    return compressImage(file);
  }
  if (file.type.startsWith("video/")) {
    const check = checkVideoSize(file);
    if (!check.ok) throw new Error(check.message);
    return file;
  }
  return file;
}
