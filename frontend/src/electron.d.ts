// frontend/src/electron.d.ts

// This defines the shape of the API that is exposed on the window object.
export interface IElectronAPI {
  getMachineId: () => Promise<string>;
}

// This tells TypeScript that the global 'Window' object
// will have a property called 'electronAPI' with the type 'IElectronAPI'.
declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
