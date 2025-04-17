"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function FileViewPage() {
  const { uuid } = useParams();
  const [fileInfo, setFileInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [signature, setSignature] = useState('');
  const [usercredentials, setUserCredentials] = useState({
    name: '',
    email: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUserCredentials(prev => ({
      ...prev,
      [name]: value
    }));
  }

  const hadnelSign = () => {
    const signature = prompt('Enter your signature');
    if (signature) {
      setSignature(signature);
    }
  }
  useEffect(() => {
    const fetchFileInfo = async () => {
      try {
        const response = await fetch(`http://localhost:3001/api/files/${uuid}`);
        if (response.ok) {
          const data = await response.json();
          setFileInfo(data);
        } else {
          setError('Failed to fetch file information');
        }
      } catch (err) {
        setError('Error loading file');
      } finally {
        setLoading(false);
      }
    };

    fetchFileInfo();
  }, [uuid]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!fileInfo) return <div>File not found</div>;

  return (
    <div className="file-view-container">
      <h1>{fileInfo.original_name}</h1>
      <div className="file-info">
        <p>Upload Date: {new Date(fileInfo.upload_date).toLocaleString()}</p>
      </div>
      <div className="file-content">
        <iframe
          src={`http://localhost:3001/api/files/${uuid}/content`}
          width="100%"
          height="600px"
          title={fileInfo.original_name}
        />
      </div>

      <div className="file-actions">
        <form action={`http://localhost:3001/api/files/${uuid}/sign`} method="POST" className="signature-form">
          <div className="form-group">
            <input 
              type="text" 
              name="name" 
              placeholder="Name" 
              onChange={handleChange}
              className="form-input"
            />
          </div>
          <div className="form-group">
            <input 
              type="email" 
              name="email" 
              placeholder="Email" 
              onChange={handleChange}
              className="form-input"
            />
          </div>
          <div className="form-group">
            <button 
              type="button" 
              onClick={hadnelSign}
              className="btn btn-secondary"
            >
              Add Signature
            </button>
          </div>
          <div className="form-group">
            <button 
              type="submit"
              className="btn btn-primary"
            >
              Sign Document
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .file-view-container {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .file-info {
          margin: 20px 0;
          padding: 15px;
          background-color: #f5f5f5;
          border-radius: 4px;
        }

        .file-content {
          margin-top: 20px;
          border: 1px solid #ddd;
          border-radius: 4px;
          overflow: hidden;
        }

        iframe {
          border: none;
        }

        .file-actions {
          margin-top: 30px;
          padding: 20px;
          background-color: #f8f9fa;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .signature-form {
          max-width: 500px;
          margin: 0 auto;
        }

        .form-group {
          margin-bottom: 15px;
        }

        .form-input {
          width: 100%;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 16px;
          transition: border-color 0.3s ease;
          color: black;
        }

        .form-input:focus {
          outline: none;
          border-color: #4CAF50;
          box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.1);
        }

        .btn {
          width: 100%;
          padding: 12px;
          border: none;
          border-radius: 4px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.3s ease;
        }

        .btn-primary {
          background-color: #4CAF50;
          color: white;
        }

        .btn-primary:hover {
          background-color: #45a049;
        }

        .btn-secondary {
          background-color: #6c757d;
          color: white;
        }

        .btn-secondary:hover {
          background-color: #5a6268;
        }
      `}</style>
    </div>
  );
} 