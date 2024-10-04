import React, { useState } from 'react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf';
import mammoth from 'mammoth';
import axios from 'axios';
import './App.css';

GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.worker.min.js`;

const App = () => {
  const [result, setResult] = useState([]);
  const [loading, setLoading] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState(null); // To track selected candidate
  
  const extractTextFromPDF = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await getDocument({ data: arrayBuffer }).promise;
    let text = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str).join(' ');
      text += pageText + '\n';
    }
    return text;
  };

  const extractTextFromDOCX = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const { value: text } = await mammoth.extractRawText({ arrayBuffer });
    return text;
  };

  const extractFileContent = async (resumeFile) => {
    if (resumeFile) {
      let text = '';
      if (resumeFile.type === 'application/pdf') {
        text = await extractTextFromPDF(resumeFile);
      } else if (resumeFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        text = await extractTextFromDOCX(resumeFile);
      } else {
        console.error('Unsupported file type. Please upload a PDF or DOCX file.');
        return;
      }
      return text;
    }
  };

  const handleFileChange = async (event) => {
    const chosenFiles = Array.prototype.slice.call(event.target.files);
    chosenFiles.forEach((file) => {
      handleUploadClick(file);
    });
  };

  const handleUploadClick = async (resumeFile) => {
    setLoading('Loading');
    if (!resumeFile) {
      console.log('Please select a resume file to upload.');
      return;
    }
    const apikey = process.env.REACT_APP_API_KEY;
    const textContent = await extractFileContent(resumeFile);
    let prompt = `Extract the following information from this resume: Name, Skills, Phone, Email, Education, Experience, Objective and give me in a json format without extra letter ${textContent}`;
    
    const response = await axios({
      url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apikey}`,
      method: "post",
      data: {
        contents: [
          { parts: [{ text: `${prompt}` }] }
        ],
      },
    });
    
    let collectedData = response.data.candidates[0].content.parts[0].text;
    collectedData = collectedData.replace(/```json|```/g, '').trim();
    let entries = JSON.parse(collectedData);
    setResult((prevResult) => [...prevResult, entries]);
    setLoading(false);
  };

  return (
    <div className='container-fluid'>
      <div className='row'>
        
        {result.length>0 && <div className='sidebar'>
          <h2>Candidate List</h2>
          <ul className='nav flex-column'>{console.log(result)}
            {result.map((candidate, index) => (
              <li key={index} className='nav-item'>
                <button
                  className='nav-link btn btn-link'
                  onClick={() => setSelectedCandidate(candidate)}
                >
                  {console.log(candidate.Name)}
                  {candidate.Name}
                </button>
              </li>
            ))}
          </ul>
        </div>}
          <div className='main-content'>
            <h1>Resume Reader with Gemini API</h1>
            <input type="file" onChange={handleFileChange} className="file-upload" multiple />
            {loading && <div className="loading">{loading}</div>}

             {selectedCandidate && (
              <div>
                <h3>Candidate Name: {selectedCandidate.Name}</h3>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Heading</th>
                      <th>Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Name</td>
                      <td>{selectedCandidate.Name}</td>
                    </tr>
                    <tr>
                      <td>Phone</td>
                      <td>{selectedCandidate.Phone}</td>
                    </tr>
                    <tr>
                      <td>Email</td>
                      <td>{selectedCandidate.Email}</td>
                    </tr>
                    <tr>
                      <td>Skills</td>
                      <td>{selectedCandidate.Skills.join(', ')}</td>
                    </tr>
                    <tr>
                      <td>Objective</td>
                      <td>{selectedCandidate.Objective}</td>
                    </tr>
                    {selectedCandidate.Education && selectedCandidate.Education.map((edu, idx) => (
                      <tr key={idx}>
                        <td>Education {idx + 1}</td>
                        <td>{edu.Institution}, {edu.Degree}, {edu.CGPA}, {edu.Dates}</td>
                      </tr>
                    ))}
                    {selectedCandidate.Experience && selectedCandidate.Experience.map((exp, idx) => (
                      <tr key={idx}>
                        <td>Experience {idx + 1}</td>
                        <td>{exp.Title} at {exp.Company}, {exp.Location} ({exp.Dates})</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
       </div>
    </div>
  );
};

export default App;
