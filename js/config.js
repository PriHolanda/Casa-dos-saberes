// Na hospedagem estática, ajuste apiUrl para o endereço público do backend.
// Também pode ser definido antes deste script pelo plugin do WordPress.
globalThis.csaConfig = {
  apiUrl: 'http://127.0.0.1:8000',
  ...globalThis.csaConfig
};
