// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  runModel: (params) => ipcRenderer.invoke('run-model', params),
  runPopulationModel: (params) => ipcRenderer.invoke('run-population-model', params),
  runTrialModel: (params) => ipcRenderer.invoke('run-trial-model', params),
});
