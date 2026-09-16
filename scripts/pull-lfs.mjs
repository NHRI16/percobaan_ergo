import fs from 'fs';
import path from 'path';
import https from 'https';

function findGlbFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      findGlbFiles(filePath, fileList);
    } else if (filePath.endsWith('.glb')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const glbFiles = [...findGlbFiles('assets'), ...findGlbFiles('models sketchfab')];

let downloads = 0;

const downloadPromises = [];

for (const file of glbFiles) {
  // Read first few bytes to check if it's an LFS pointer
  const buffer = Buffer.alloc(100);
  let fd;
  try {
    fd = fs.openSync(file, 'r');
    fs.readSync(fd, buffer, 0, 100, 0);
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }

  const content = buffer.toString('utf8');
  
  if (content.startsWith('version https://git-lfs.github.com/spec/v1')) {
    downloads++;
    const repoPath = file.replace(/\\/g, '/');
    const url = `https://media.githubusercontent.com/media/NHRI16/percobaan_ergo/master/${encodeURI(repoPath)}`;
    
    console.log(`Downloading LFS file: ${repoPath}`);
    
    const downloadFile = (url, dest) => {
      return new Promise((resolve, reject) => {
        const fileStream = fs.createWriteStream(dest);
        https.get(url, (response) => {
          if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
            downloadFile(response.headers.location, dest).then(resolve).catch(reject);
          } else if (response.statusCode === 200) {
            response.pipe(fileStream);
            fileStream.on('finish', () => {
              fileStream.close();
              resolve();
            });
          } else {
            reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
          }
        }).on('error', (err) => {
          fs.unlink(dest, () => reject(err));
        });
      });
    };

    const promise = downloadFile(url, file + '.tmp')
      .then(() => {
        fs.renameSync(file + '.tmp', file);
        console.log(`Successfully downloaded ${repoPath}`);
      })
      .catch(err => {
        console.error(`Error downloading ${repoPath}:`, err);
        process.exit(1);
      });
    downloadPromises.push(promise);
  }
}

if (downloads === 0) {
  console.log("No LFS pointers found. All files are already actual models.");
} else {
  Promise.all(downloadPromises).then(() => {
    console.log("All LFS files downloaded successfully.");
  });
}
