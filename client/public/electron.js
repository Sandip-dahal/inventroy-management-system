const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const XLSX = require('xlsx');

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow;

const createWindow = () => {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
  });

  // Load the app
  const startUrl = process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, '../build/index.html')}`;
  
  mainWindow.loadURL(startUrl);

  // Open the DevTools in development mode
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
};

// Handle saving bills to path
ipcMain.handle('saveBillToPath', async (event, folderPath, filename, content) => {
  try {
    // Create folder if it doesn't exist
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    
    const filePath = path.join(folderPath, filename);
    
    // If content is ArrayBuffer, convert to Buffer
    let bufferContent;
    if (content instanceof ArrayBuffer) {
      bufferContent = Buffer.from(content);
    } else if (typeof content === 'string') {
      bufferContent = Buffer.from(content, 'utf8');
    } else {
      bufferContent = content;
    }
    
    fs.writeFileSync(filePath, bufferContent);
    
    return { success: true, path: filePath };
  } catch (error) {
    console.error('Error saving bill:', error);
    return { success: false, error: error.message };
  }
});

// Handle saving Excel files to path
ipcMain.handle('saveExcelToPath', async (event, folderPath, filename, excelBuffer) => {
  try {
    // Create folder if it doesn't exist
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    
    const filePath = path.join(folderPath, filename);
    
    // Convert ArrayBuffer to Buffer
    const buffer = Buffer.from(excelBuffer);
    fs.writeFileSync(filePath, buffer);
    
    return { success: true, path: filePath };
  } catch (error) {
    console.error('Error saving Excel file:', error);
    return { success: false, error: error.message };
  }
});

// Handle reading Excel files
ipcMain.handle('readExcelFile', async (event, folderPath, filename) => {
  try {
    const filePath = path.join(folderPath, filename);
    
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'File does not exist' };
    }
    
    const data = fs.readFileSync(filePath);
    return { success: true, data };
  } catch (error) {
    console.error('Error reading Excel file:', error);
    return { success: false, error: error.message };
  }
});

// Handle selecting a folder
ipcMain.handle('select-folder', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select Billing Folder'
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      return { success: true, path: result.filePaths[0] };
    } else {
      return { success: false, error: 'No folder selected' };
    }
  } catch (error) {
    console.error('Error selecting folder:', error);
    return { success: false, error: error.message };
  }
});

// Handle getting desktop path
ipcMain.handle('get-desktop-path', async () => {
  try {
    const desktopPath = path.join(os.homedir(), 'Desktop');
    return { success: true, path: desktopPath };
  } catch (error) {
    console.error('Error getting desktop path:', error);
    return { success: false, error: error.message };
  }
});

// Handle appending to Excel file
ipcMain.handle('appendToExcel', async (event, folderPath, filename, newData) => {
  try {
    const filePath = path.join(folderPath, filename);
    let workbook;
    let worksheet;
    
    if (fs.existsSync(filePath)) {
      // Read existing file
      const fileBuffer = fs.readFileSync(filePath);
      workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      worksheet = workbook.Sheets[workbook.SheetNames[0]];
      
      // Get the last row
      const range = XLSX.utils.decode_range(worksheet['!ref']);
      const lastRow = range.e.r + 1;
      
      // Add new data
      XLSX.utils.sheet_add_aoa(worksheet, [newData], { origin: lastRow + 1 });
    } else {
      // Create new workbook
      workbook = XLSX.utils.book_new();
      worksheet = XLSX.utils.aoa_to_sheet([newData]);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Bills');
    }
    
    // Write to file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    fs.writeFileSync(filePath, Buffer.from(excelBuffer));
    
    return { success: true, path: filePath };
  } catch (error) {
    console.error('Error appending to Excel file:', error);
    return { success: false, error: error.message };
  }
});

// Handle creating Excel file with headers
ipcMain.handle('createExcelWithHeaders', async (event, folderPath, filename, headers, data) => {
  try {
    // Create folder if it doesn't exist
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    
    const filePath = path.join(folderPath, filename);
    
    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([headers, data]);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Bills');
    
    // Write to file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    fs.writeFileSync(filePath, Buffer.from(excelBuffer));
    
    return { success: true, path: filePath };
  } catch (error) {
    console.error('Error creating Excel file:', error);
    return { success: false, error: error.message };
  }
});

// This method will be called when Electron has finished initialization
app.whenReady().then(createWindow);

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window when the dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});