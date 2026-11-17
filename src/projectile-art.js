import {createArtworkCanvas} from './tile-art.js';

const rocketPalettes = {
  310: ['#e4e4de', '#a8adad', '#646b70', '#30353a'],
  314: ['#ff8b80', '#d83b33', '#9f221c', '#541713'],
  316: ['#9b9d98', '#6d706d', '#464a48', '#242828'],
  326: ['#edf0e9', '#b6bcb9', '#727b79', '#383e3c'],
};

const bulletPalettes = new Map([
  [306, ['#fffbd4', '#ffd875', '#ffab34', '#b85e17', '#512b17']],
  [346, ['#fff0e5', '#ff9b98', '#ff424b', '#b7202a', '#501a21']],
]);

function paintBullet(ctx, colors) {
  const finish = ctx.createRadialGradient(3.8, 3.6, 0, 5, 5, 4);
  const stops = [0, .23, .56, .82, 1];
  colors.forEach((color, i) => finish.addColorStop(stops[i], color));
  ctx.fillStyle = finish;
  ctx.beginPath();
  ctx.arc(5, 5, 4, 0, 2 * Math.PI);
  ctx.fill();
}

function metal(ctx, top, bottom, colors) {
  const finish = ctx.createLinearGradient(0, top, 0, bottom);
  finish.addColorStop(0, colors[0]);
  finish.addColorStop(0.31, colors[1]);
  finish.addColorStop(0.67, colors[2]);
  finish.addColorStop(1, colors[3]);
  return finish;
}

function polygon(ctx, color, points) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(...points[0]);
  for (const point of points.slice(1)) ctx.lineTo(...point);
  ctx.closePath();
  ctx.fill();
}

function paintRocket(ctx, id) {
  const colors = rocketPalettes[id];
  polygon(ctx, metal(ctx, 2.6, 12.5, colors), [[3, 4.9], [5, 2.8], [8.6, 2.8], [11, 4.8], [10, 12.5], [5.1, 12.5], [3, 10.1]]);
  polygon(ctx, metal(ctx, 4.9, 10.8, colors), [[3.1, 5], [15.9, 5], [18.4, 5.6], [19.6, 7.1], [19.6, 8.6], [18.1, 10], [4.1, 10.5], [2.8, 9.4], [2.8, 6.4]]);
  polygon(ctx, colors[0], [[4.2, 5.9], [12.3, 5.9], [13.4, 6.6], [3.9, 6.6]]);
  polygon(ctx, colors[3], [[4.1, 9.2], [13.7, 9.2], [12.5, 10.3], [4.9, 10.4]]);
  ctx.fillStyle = colors[3];
  ctx.fillRect(13.4, 5.1, 0.55, 4.8);
  ctx.fillStyle = colors[0];
  ctx.fillRect(14.05, 5.65, 0.45, 3.6);
  if (id === 326) {
    ctx.fillStyle = '#a4934c';
    ctx.fillRect(14.2, 5.1, 3.6, 4.9);
    ctx.fillStyle = '#e1ce79';
    for (let row = 0; row < 4; row++) {
      for (let column = 0; column < 3; column++) {
        if ((row + column) % 2 === 0) ctx.fillRect(14.35 + column * 1.08, 5.4 + row * 1.12, 0.86, 0.86);
      }
    }
  }
}

function paintCanister(ctx, colors, tail) {
  ctx.fillStyle = metal(ctx, 2.4, 8.1, tail);
  ctx.fillRect(2.8, 2.5, 5.5, 6);
  ctx.fillStyle = metal(ctx, 2.4, 8.1, rocketPalettes[310]);
  ctx.fillRect(13.2, 2.5, 3.2, 6);
  ctx.fillStyle = metal(ctx, 2.4, 8.2, colors);
  ctx.fillRect(8.6, 2.5, 4.1, 5.8);
  ctx.fillStyle = colors[0];
  ctx.fillRect(9.15, 3.3, 2.95, 0.48);
  ctx.fillStyle = '#171514';
  ctx.fillRect(4, 5.8, 0.85, 2.9);
  ctx.fillRect(6.2, 5.8, 0.85, 2.9);
}

function paintHandGrenade(ctx) {
  polygon(ctx, metal(ctx, 2.1, 8.4, ['#deddb0', '#9a9b68', '#62623f', '#393b25']),
    [[2.1, 4.1], [3.5, 2.4], [6.2, 2.2], [7.9, 3.8], [8.4, 6.5], [6.8, 8.3], [4.2, 8.3], [2.6, 6.8]]);
  polygon(ctx, '#555639', [[2.4, 5.8], [7.9, 4.9], [8.2, 5.6], [3.1, 6.6]]);
  polygon(ctx, '#c4c39a', [[3.15, 3.5], [4.25, 2.55], [6, 2.2], [6.2, 3.05], [4.4, 3.55], [4, 4.7], [3.1, 4.85]]);
  ctx.fillStyle = '#e4e0b7';
  ctx.fillRect(5, 2.65, 1.4, 0.4);
}

function paintArrow(ctx) {
  polygon(ctx, metal(ctx, 1, 5.8, ['#ff6748', '#e32719', '#981c14', '#4d1112']),
    [[0.3, 0.8], [4.6, 0.85], [8.1, 3.2], [4.8, 5.9], [0.1, 5.9], [2.7, 3.4]]);
  polygon(ctx, '#ff5a36', [[0.8, 1.1], [4.4, 1.2], [6.5, 2.7], [3.3, 2.3]]);
  ctx.fillStyle = metal(ctx, 2.5, 4.1, ['#edc775', '#b1853b', '#674924', '#342410']);
  ctx.fillRect(6.4, 2.6, 22.1, 1.6);
  ctx.fillStyle = '#edc775';
  ctx.fillRect(10.5, 2.8, 12.5, 0.28);
  polygon(ctx, metal(ctx, 1.5, 5.5, ['#f6f6ed', '#cbd0cf', '#7c858b', '#343a42']),
    [[28.1, 1.6], [31.5, 2], [33.8, 3.4], [31.5, 4.9], [28.2, 5.3], [29.2, 3.45]]);
  polygon(ctx, '#ecf0e9', [[29.1, 2.15], [31.3, 2.48], [33, 3.35], [29.9, 3.05]]);
}

const painters = new Map([
  [308, paintHandGrenade],
  [310, ctx => paintRocket(ctx, 310)],
  [314, ctx => paintRocket(ctx, 314)],
  [316, ctx => paintRocket(ctx, 316)],
  [318, ctx => paintCanister(ctx, ['#ffc0b8', '#f34a41', '#ae231e', '#620f13'], rocketPalettes[310])],
  [320, ctx => paintCanister(ctx, ['#fff5a3', '#e5bb39', '#9d691c', '#61370f'], ['#fff0c1', '#d8ad66', '#98703a', '#514022'])],
  [326, ctx => paintRocket(ctx, 326)],
  [329, paintArrow],
]);

export function prepareProjectileArt(data, images) {
  const prepared = [];
  for (const id of [...bulletPalettes.keys(), ...painters.keys()]) {
    const original = images.get(id);
    if (!original) throw Error('Missing original projectile shape ' + id);
    const [,, width, height] = data.symbols[id].bounds;
    const surface = createArtworkCanvas(Math.ceil(width * 4), Math.ceil(height * 4));
    const ctx = surface.getContext('2d');
    ctx.save();
    ctx.scale(surface.width / width, surface.height / height);
    const bulletColors = bulletPalettes.get(id);
    if (bulletColors) {
      paintBullet(ctx, bulletColors);
    } else {
      ctx.fillStyle = '#111314';
      ctx.fillRect(0, 0, width, height);
      painters.get(id)(ctx);
    }
    ctx.restore();

    // Clip the new finish to the original outline and preserve soft edge alpha.
    if (!bulletColors) {
      ctx.imageSmoothingQuality = 'high';
      ctx.globalCompositeOperation = 'destination-in';
      ctx.drawImage(original, 0, 0, surface.width, surface.height);
    }
    surface.sharpVector = true;
    surface.remasteredProjectile = true;
    prepared.push([id, surface]);
  }

  for (const [id, surface] of prepared) images.set(id, surface);
  return prepared.length;
}
