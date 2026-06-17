import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { deflateSync } from 'node:zlib';

const outDir = resolve('client/assets/textures');

const colors = {
  transparent: [0, 0, 0, 0],
  cream: [255, 242, 210, 255],
  warmPanel: [255, 231, 176, 255],
  panelEdge: [132, 88, 53, 255],
  brown: [126, 81, 45, 255],
  darkBrown: [72, 45, 28, 255],
  table: [173, 111, 61, 255],
  tableEdge: [91, 55, 34, 255],
  green: [99, 176, 92, 255],
  red: [218, 83, 73, 255],
  blue: [84, 154, 205, 255],
  yellow: [246, 199, 77, 255],
  white: [255, 255, 255, 255],
  black: [33, 31, 30, 255],
  shadow: [60, 36, 28, 80]
};

function createImage(width, height, fill = colors.transparent) {
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    data[i * 4] = fill[0];
    data[i * 4 + 1] = fill[1];
    data[i * 4 + 2] = fill[2];
    data[i * 4 + 3] = fill[3];
  }
  return { width, height, data };
}

function blendPixel(image, x, y, color) {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) {
    return;
  }
  const index = (Math.floor(y) * image.width + Math.floor(x)) * 4;
  const alpha = color[3] / 255;
  const inverse = 1 - alpha;
  image.data[index] = Math.round(color[0] * alpha + image.data[index] * inverse);
  image.data[index + 1] = Math.round(color[1] * alpha + image.data[index + 1] * inverse);
  image.data[index + 2] = Math.round(color[2] * alpha + image.data[index + 2] * inverse);
  image.data[index + 3] = Math.min(255, Math.round(color[3] + image.data[index + 3] * inverse));
}

function rect(image, x, y, width, height, color) {
  for (let yy = y; yy < y + height; yy += 1) {
    for (let xx = x; xx < x + width; xx += 1) {
      blendPixel(image, xx, yy, color);
    }
  }
}

function roundedRect(image, x, y, width, height, radius, color) {
  for (let yy = y; yy < y + height; yy += 1) {
    for (let xx = x; xx < x + width; xx += 1) {
      const left = xx < x + radius;
      const right = xx >= x + width - radius;
      const top = yy < y + radius;
      const bottom = yy >= y + height - radius;
      let inside = true;
      if ((left || right) && (top || bottom)) {
        const cx = left ? x + radius : x + width - radius - 1;
        const cy = top ? y + radius : y + height - radius - 1;
        inside = (xx - cx) ** 2 + (yy - cy) ** 2 <= radius ** 2;
      }
      if (inside) {
        blendPixel(image, xx, yy, color);
      }
    }
  }
}

function circle(image, cx, cy, radius, color) {
  for (let yy = Math.floor(cy - radius); yy <= cy + radius; yy += 1) {
    for (let xx = Math.floor(cx - radius); xx <= cx + radius; xx += 1) {
      if ((xx - cx) ** 2 + (yy - cy) ** 2 <= radius ** 2) {
        blendPixel(image, xx, yy, color);
      }
    }
  }
}

function ellipse(image, cx, cy, rx, ry, color) {
  for (let yy = Math.floor(cy - ry); yy <= cy + ry; yy += 1) {
    for (let xx = Math.floor(cx - rx); xx <= cx + rx; xx += 1) {
      if (((xx - cx) ** 2) / (rx ** 2) + ((yy - cy) ** 2) / (ry ** 2) <= 1) {
        blendPixel(image, xx, yy, color);
      }
    }
  }
}

function line(image, x0, y0, x1, y1, thickness, color) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= steps; i += 1) {
    const t = steps === 0 ? 0 : i / steps;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    circle(image, x, y, thickness / 2, color);
  }
}

function triangle(image, points, color) {
  const [a, b, c] = points;
  const minX = Math.floor(Math.min(a[0], b[0], c[0]));
  const maxX = Math.ceil(Math.max(a[0], b[0], c[0]));
  const minY = Math.floor(Math.min(a[1], b[1], c[1]));
  const maxY = Math.ceil(Math.max(a[1], b[1], c[1]));
  const area = edge(a, b, c);
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const p = [x, y];
      const w0 = edge(b, c, p);
      const w1 = edge(c, a, p);
      const w2 = edge(a, b, p);
      if ((area >= 0 && w0 >= 0 && w1 >= 0 && w2 >= 0) || (area < 0 && w0 <= 0 && w1 <= 0 && w2 <= 0)) {
        blendPixel(image, x, y, color);
      }
    }
  }
}

function edge(a, b, c) {
  return (c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0]);
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function encodePng(image) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(image.width, 0);
  ihdr.writeUInt32BE(image.height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const scanlineLength = image.width * 4 + 1;
  const raw = Buffer.alloc(scanlineLength * image.height);
  for (let y = 0; y < image.height; y += 1) {
    raw[y * scanlineLength] = 0;
    image.data.copy?.();
    for (let x = 0; x < image.width * 4; x += 1) {
      raw[y * scanlineLength + 1 + x] = image.data[y * image.width * 4 + x];
    }
  }

  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0))
  ]);
}

const crcTable = new Uint32Array(256).map((_, index) => {
  let c = index;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return c >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

async function save(name, image) {
  const filePath = resolve(outDir, name);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, encodePng(image));
}

function drawPanel(width, height, base = colors.warmPanel) {
  const image = createImage(width, height, colors.transparent);
  roundedRect(image, 0, 0, width, height, 24, colors.panelEdge);
  roundedRect(image, 10, 10, width - 20, height - 20, 18, base);
  roundedRect(image, 22, 22, width - 44, Math.max(16, height * 0.2), 10, [255, 249, 226, 170]);
  return image;
}

function drawRestaurantBackground() {
  const image = createImage(720, 1280, colors.cream);
  rect(image, 0, 0, 720, 690, [255, 227, 190, 255]);
  for (let y = 42; y < 690; y += 84) {
    line(image, 0, y, 720, y, 3, [236, 190, 148, 255]);
  }
  for (let x = -80; x < 760; x += 120) {
    line(image, x, 0, x + 120, 690, 2, [248, 210, 170, 255]);
  }
  rect(image, 0, 690, 720, 590, [214, 160, 102, 255]);
  for (let y = 720; y < 1280; y += 86) {
    line(image, 0, y, 720, y - 50, 4, [158, 105, 62, 255]);
  }
  for (let x = -120; x < 780; x += 120) {
    line(image, x, 690, x + 120, 1280, 3, [186, 126, 72, 255]);
  }
  roundedRect(image, 46, 84, 628, 160, 36, [178, 112, 64, 255]);
  roundedRect(image, 68, 106, 584, 116, 26, [255, 239, 204, 255]);
  circle(image, 360, 162, 32, [255, 210, 104, 255]);
  circle(image, 342, 152, 7, colors.darkBrown);
  circle(image, 378, 152, 7, colors.darkBrown);
  ellipse(image, 360, 177, 22, 10, [231, 122, 96, 255]);
  return image;
}

function drawTable(state) {
  const image = createImage(240, 170, colors.transparent);
  ellipse(image, 120, 140, 92, 18, colors.shadow);
  roundedRect(image, 34, 42, 172, 76, 28, colors.tableEdge);
  roundedRect(image, 44, 32, 152, 76, 26, colors.table);
  rect(image, 64, 105, 18, 42, colors.tableEdge);
  rect(image, 158, 105, 18, 42, colors.tableEdge);
  roundedRect(image, 72, 122, 96, 24, 12, colors.tableEdge);
  if (state === 'ready') {
    circle(image, 120, 72, 28, colors.yellow);
    circle(image, 120, 72, 18, colors.white);
  }
  if (state === 'food') {
    circle(image, 98, 72, 24, colors.white);
    circle(image, 98, 72, 14, colors.green);
    circle(image, 145, 70, 22, colors.white);
    circle(image, 145, 70, 12, colors.red);
  }
  if (state === 'pay') {
    roundedRect(image, 80, 46, 84, 50, 10, colors.yellow);
    circle(image, 104, 72, 10, colors.brown);
    line(image, 126, 62, 148, 62, 5, colors.brown);
    line(image, 126, 80, 148, 80, 5, colors.brown);
  }
  return image;
}

function drawCashier() {
  const image = createImage(220, 180, colors.transparent);
  ellipse(image, 110, 154, 78, 16, colors.shadow);
  roundedRect(image, 48, 54, 124, 86, 18, [204, 84, 68, 255]);
  roundedRect(image, 66, 30, 88, 48, 14, [255, 226, 130, 255]);
  roundedRect(image, 68, 92, 84, 28, 8, [83, 48, 38, 255]);
  rect(image, 80, 136, 18, 28, colors.darkBrown);
  rect(image, 124, 136, 18, 28, colors.darkBrown);
  circle(image, 88, 104, 5, colors.yellow);
  line(image, 110, 104, 142, 104, 5, colors.yellow);
  return image;
}

function drawAnimal(kind, fur, accent) {
  const image = createImage(180, 180, colors.transparent);
  ellipse(image, 90, 154, 56, 12, colors.shadow);
  if (kind === 'rabbit') {
    ellipse(image, 60, 44, 17, 42, fur);
    ellipse(image, 120, 44, 17, 42, fur);
    ellipse(image, 60, 44, 8, 28, accent);
    ellipse(image, 120, 44, 8, 28, accent);
  } else if (kind === 'bear') {
    circle(image, 52, 58, 24, fur);
    circle(image, 128, 58, 24, fur);
  } else {
    triangle(image, [[48, 74], [66, 28], [88, 74]], fur);
    triangle(image, [[92, 74], [114, 28], [134, 74]], fur);
    triangle(image, [[58, 65], [68, 43], [80, 66]], accent);
    triangle(image, [[103, 66], [114, 43], [124, 66]], accent);
  }
  circle(image, 90, 88, 62, fur);
  ellipse(image, 90, 108, 34, 26, accent);
  circle(image, 68, 84, 8, colors.black);
  circle(image, 112, 84, 8, colors.black);
  circle(image, 71, 81, 3, colors.white);
  circle(image, 115, 81, 3, colors.white);
  triangle(image, [[86, 102], [94, 102], [90, 110]], colors.darkBrown);
  line(image, 90, 110, 90, 119, 3, colors.darkBrown);
  line(image, 90, 119, 78, 126, 3, colors.darkBrown);
  line(image, 90, 119, 102, 126, 3, colors.darkBrown);
  return image;
}

function drawIcon(kind) {
  const image = createImage(96, 96, colors.transparent);
  circle(image, 48, 48, 40, kind === 'stamina' ? colors.red : colors.yellow);
  if (kind === 'coin') {
    circle(image, 48, 48, 27, [255, 225, 92, 255]);
    line(image, 36, 48, 60, 48, 6, [178, 118, 38, 255]);
    line(image, 48, 33, 48, 63, 5, [178, 118, 38, 255]);
  } else if (kind === 'stamina') {
    circle(image, 48, 52, 24, [255, 235, 236, 255]);
    circle(image, 36, 40, 16, [255, 235, 236, 255]);
    circle(image, 60, 40, 16, [255, 235, 236, 255]);
  } else if (kind === 'star') {
    for (let i = 0; i < 5; i += 1) {
      const angle = -Math.PI / 2 + i * (Math.PI * 2 / 5);
      const x = 48 + Math.cos(angle) * 30;
      const y = 48 + Math.sin(angle) * 30;
      line(image, 48, 48, x, y, 12, [255, 246, 160, 255]);
    }
  }
  return image;
}

await save('restaurant-bg.png', drawRestaurantBackground());
await save('panel.png', drawPanel(640, 220));
await save('card.png', drawPanel(520, 260, [255, 238, 194, 255]));
await save('button.png', drawPanel(420, 120, [255, 195, 82, 255]));
await save('button-disabled.png', drawPanel(420, 120, [170, 160, 148, 255]));
await save('table-empty.png', drawTable('empty'));
await save('table-ready.png', drawTable('ready'));
await save('table-food.png', drawTable('food'));
await save('table-pay.png', drawTable('pay'));
await save('cashier.png', drawCashier());
await save('customer-cat.png', drawAnimal('cat', [234, 158, 86, 255], [255, 220, 176, 255]));
await save('customer-dog.png', drawAnimal('dog', [166, 113, 72, 255], [244, 208, 165, 255]));
await save('customer-rabbit.png', drawAnimal('rabbit', [242, 238, 229, 255], [255, 184, 203, 255]));
await save('customer-bear.png', drawAnimal('bear', [151, 98, 62, 255], [226, 178, 126, 255]));
await save('icon-coin.png', drawIcon('coin'));
await save('icon-stamina.png', drawIcon('stamina'));
await save('icon-star.png', drawIcon('star'));

console.log(`Generated textures in ${outDir}`);
