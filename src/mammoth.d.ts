// La versión de mammoth armada para el navegador (sin dependencias de Node).
declare module 'mammoth/mammoth.browser.min.js' {
  const mammoth: typeof import('mammoth');
  export default mammoth;
}
