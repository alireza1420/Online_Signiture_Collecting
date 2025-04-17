"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function UploadPage() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [selectedOption, setSelectedOption] = useState('pc');
  const [uploadState, setUploadState] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
  const handleClick = (uuid) => {
    router.push(`/files/${uuid}`);
  };
  
  const handleOptionChange = (option) => {
    setSelectedOption(option);
  };

  const handleSignIn = () => {
    setIsSignedIn(true);
  };

  // Fetch uploaded files
  const fetchFiles = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/files');
      if (response.ok) {
        const data = await response.json();
        setFiles(data);
      } else {
        console.error('Failed to fetch files');
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  useEffect(() => {
    if (selectedOption === 'pc') {
      console.log("this is pc");
    }
  }, [selectedOption]);

  const handleFileUpload = async (event) => {
    event.preventDefault();

    const formData = new FormData(event.target);

    try {
      setUploadState('Uploading...');
      const response = await fetch('http://localhost:3001/api/upload-pc', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setUploadState(data.message);
        console.log('Upload details:', data.file);
        // Refresh the file list after successful upload
        fetchFiles();
      } else {
        const errorData = await response.json();
        setUploadState(`Upload failed: ${errorData.error}`);
      }
    } catch (error) {
      setUploadState(`Upload failed: ${error.message}`);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Link copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  };

  return (
    <div>
      {/* Header Section with Two Options */}
      <div className="header">
        <button onClick={() => handleOptionChange('pc')}>Upload Form PC</button>
        <button onClick={() => handleOptionChange('onedrive')}>Upload from OneDrive</button>
      </div>

      {/* Content Section */}
      <div className="content">
        {selectedOption === 'pc' && (
          <div id="upload-pc">
            <h2>Upload from PC</h2>
            <form onSubmit={handleFileUpload}>
              <input type="file" name="file" required />
              <button value={'pc'} type="submit">Upload</button>
            </form>
          </div>
        )}

        {selectedOption === 'onedrive' && (
          <div id="upload-onedrive">
            <h2>Upload from OneDrive</h2>
            <button onClick={() => alert('OneDrive integration will be here')}>
              Select from OneDrive
            </button>
          </div>
        )}
        {uploadState && <p>{uploadState}</p>}

        {/* Display uploaded files */}
        <div className="files-list">
          <h2>Uploaded Files</h2>
          {loading ? (
            <p>Loading files...</p>
          ) : files.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Original Name</th>
                  <th>Upload Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr key={file.id}>
                    <td>{file.original_name}</td>
                    <td>{new Date(file.upload_date).toLocaleString()}</td>
                    <td>
                      <button 
                        onClick={() => handleClick(file.uuid)}
                        style={{ marginRight: '8px' }}
                      >
                        View File
                      </button>
                      <button onClick={() => copyToClipboard(`http://localhost:3001/api/files/${file.uuid}/content`)}>
                        Copy Link
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No files uploaded yet</p>
          )}
        </div>
      </div>

      <style jsx>{`
        .header {
          display: flex;
          justify-content: center;
          gap: 20px;
          margin-top: 20px;
        }

        .header button {
          font-size: 18px;
          padding: 10px 20px;
          cursor: pointer;
          background-color: #333;
          color: white;
          border: none;
          border-radius: 5px;
        }

        .header button:hover {
          background-color: #555;
        }

        .content {
          padding: 20px;
          text-align: center;
        }

        form input,
        form button,
        input [type="text"],
        input [type="email"] {
          margin-top: 10px;
          padding: 10px;
        }

        .files-list {
          margin-top: 30px;
          text-align: left;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }

        th, td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }

        th {
          background-color: #f5f5f5;
        }

        .files-list button {
          padding: 6px 12px;
          background-color: #4CAF50;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .files-list button:hover {
          background-color: #45a049;
        }
      `}</style>
    </div>
  );
}