const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  saveBill: (shopName, filename, content) => 
    ipcRenderer.invoke('save-bill', shopName, filename, content),
  
    saveBillToPath: (folderPath, filename, content) => 
    ipcRenderer.invoke('saveBillToPath', folderPath, filename, content),
  
  saveExcelToPath: (folderPath, filename, excelBuffer) => 
    ipcRenderer.invoke('saveExcelToPath', folderPath, filename, excelBuffer),
  
  readExcelFile: (folderPath, filename) => 
    ipcRenderer.invoke('readExcelFile', folderPath, filename),
  
  selectFolder: () => 
    ipcRenderer.invoke('select-folder'),
  
  getDesktopPath: () => 
    ipcRenderer.invoke('get-desktop-path'),
  
  appendToExcel: (folderPath, filename, newData) => 
    ipcRenderer.invoke('appendToExcel', folderPath, filename, newData),
  
  createExcelWithHeaders: (folderPath, filename, headers, data) => 
    ipcRenderer.invoke('createExcelWithHeaders', folderPath, filename, headers, data)
});