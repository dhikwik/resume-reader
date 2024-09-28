import React, { useState } from 'react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf';
import mammoth from 'mammoth';
import axios from 'axios';
import './App.css';


GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.worker.min.js`;

const App = () => {
  const [resumeFile, setResumeFile] = useState(null);
  const [result, setResult] = useState();
  const [loading,setLoading] = useState('')
 
  
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

  const extractFileContent = async () => {
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
    const file = event.target.files[0];
    setResumeFile(file);
  };

  const handleUploadClick = async () => {
    setLoading('Loading')
    if (!resumeFile) {
      console.log('Please select a resume file to upload.');
      return;
    }
    const apikey = process.env.REACT_APP_API_KEY;
    const textContent = await extractFileContent(resumeFile);
    let prompt = `Extract the following information from this resume: Name, Skills, Phone, Email, Education, Experience, Objective and give me in a json format without extra letter${textContent}`
    console.log("Text read from uploaded file",textContent)
     const response = await axios({
        url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apikey}`,
        method: "post",
        data: {
          contents: [
            { parts: [{ text : `${prompt}`}]}
          ],
        },
      })
      let collectedData = response.data.candidates[0].content.parts[0].text;
      collectedData = collectedData.replace(/```json|```/g, '').trim();
      console.log("Response from Gemini API",JSON.parse(collectedData))
      const entries = JSON.parse(collectedData);
      setResult(entries);
      setLoading('')

   };

  return (
    <div className='container'>
      <h1>Resume Reader with Gemini API</h1>
      <input type="file" onChange={handleFileChange} className="file-upload" />
      <button onClick={handleUploadClick} className="btn btn-primary"> Upload Resume</button>
      {loading}
      {result && (
        <>
          <h3>User Information</h3>
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
                <td>{result.Name}</td>
              </tr>
              <tr>
                <td>Phone</td>
                <td>{result.Phone}</td>
              </tr>
              <tr>
                <td>Email</td>
                <td>{result.Email}</td>
              </tr>
              <tr>
                <td>Skills</td>
                <td>{result.Skills.join(', ')}</td>
              </tr>
              <tr>
                <td>Objective</td>
                <td>{result.Objective}</td>
              </tr>
              {result.Education.map((edu, index) => (
                <tr key={index}>
                  <td>Education {index + 1}</td>
                  <td>
                    {edu.Institution}, {edu.Degree}, {edu.CGPA}, {edu.Dates}
                  </td>
                </tr>
              ))}
              {result.Experience.map((exp, index) => (
                <tr key={index}>
                  <td>Experience {index + 1}</td>
                  <td>
                    {exp.Title} at {exp.Company}, {exp.Location} ({exp.Dates})
                    <ul>
                      {exp.Description.map((desc, i) => (
                        <li key={i}>{desc}</li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
              {result.Projects.map((proj, index) => (
                <tr key={index}>
                  <td>Project {index + 1}</td>
                  <td>
                    {proj.Name} - {proj.Technologies}, {proj.Dates}
                    <ul>
                      {proj.Description.map((desc, i) => (
                        <li key={i}>{desc}</li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
         </>
      )}
    </div>
  );
};

export default App;
