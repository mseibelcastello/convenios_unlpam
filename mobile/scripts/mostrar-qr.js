// Dibuja en la terminal el código QR de una dirección.
// Uso: node scripts/mostrar-qr.js exp://192.168.1.6:8081
// Usa "toqr", el mismo generador que trae Expo.
const { toQR } = require('toqr');

const url = process.argv[2];
const modulos = toQR(url); // lista de 0 y 1, fila por fila
const lado = Math.sqrt(modulos.length);
const margen = 2; // borde claro alrededor, necesario para que el celular lo lea

const CLARO = '\x1b[47m  \x1b[0m';
const OSCURO = '\x1b[40m  \x1b[0m';

for (let y = -margen; y < lado + margen; y++) {
  let linea = '';
  for (let x = -margen; x < lado + margen; x++) {
    const dentro = x >= 0 && y >= 0 && x < lado && y < lado;
    linea += dentro && modulos[y * lado + x] ? OSCURO : CLARO;
  }
  console.log(linea);
}
