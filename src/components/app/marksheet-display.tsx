
'use client';

import * as React from 'react';
import type { MarksheetDisplayData } from '@/types'; // Keep MarksheetDisplayData import
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Download, Printer, FilePlus2, ArrowLeft, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toPng } from 'html-to-image'; // Import html-to-image

interface MarksheetDisplayProps {
  data: MarksheetDisplayData;
  onCreateNew?: () => void;
  onEditBack?: () => void; // New prop
}

export function MarksheetDisplay({ data, onCreateNew, onEditBack }: MarksheetDisplayProps) {
  const marksheetRef = React.useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadImage = async () => { // Made async to use await with toPng
    if (typeof window !== 'undefined' && marksheetRef.current) {
      const element = marksheetRef.current;
      if (!element) return;

      toPng(element, {
        cacheBust: true, // To prevent caching issues
      })
        .then((dataUrl) => {
          const link = document.createElement('a'); // Create download link
          link.download = `${data.studentName.replace(/\s+/g, '-')}-Marksheet.png`; // Set download filename
          link.href = dataUrl; // Set href to data URL
          link.click(); // Trigger click to download
        }).catch(err => {
          console.error('Error generating image:', err);
        });
      // .catch(err => {
      //   console.error('Error loading html2canvas:', err);
      // });
    } else {
      console.log("Error: Cannot run html2canvas outside of browser environment.");
    }
  };

  // const handleDownloadPDF = () => {
  //   if (typeof window !== 'undefined' && marksheetRef.current) {
  //     import('html2pdf.js').then((html2pdf) => {
  //       const element = marksheetRef.current;
  //       const opt = {
  //         margin: [10, 12, 10, 12], // top, left, bottom, right (in mm)
  //         filename: `${data.studentName.replace(/\s+/g, '-')}-Marksheet.pdf`,
  //         image: { type: 'jpeg', quality: 0.98 },
  //         html2canvas: {
  //           scale: 2,
  //           useCORS: true,
  //           allowTaint: true,
  //           logging: true,
  //           letterRendering: true,
  //           backgroundColor: '#FFFFFF'
  //         },
  //         jsPDF: {
  //           unit: 'mm',
  //           format: 'a4',
  //           orientation: 'portrait',
  //           compress: true
  //         },
  //         pagebreak: {
  //           mode: ['avoid-all', 'css', 'legacy']
  //         },
  //         // Custom processing to ensure proper styling
  //         onclone: (clonedDoc) => {
  //           // Force print styles to be applied
  //           clonedDoc.documentElement.classList.add('printing-pdf');
  //           // Ensure all elements are visible
  //           const elements = clonedDoc.querySelectorAll('*');
  //           elements.forEach(el => {
  //             if (el instanceof HTMLElement) {
  //               el.style.boxSizing = 'border-box';
  //               el.style.overflow = 'visible !important';
  //             }
  //           });
  //         }
  //       };

  //       // Create worker
  //       const worker = html2pdf.default()
  //         .set(opt)
  //         .from(element)
  //         .toPdf()
  //         .get('pdf')
  //         .then((pdf) => {
  //           // Additional PDF formatting if needed
  //           const totalPages = pdf.internal.getNumberOfPages();
  //           for (let i = 1; i <= totalPages; i++) {
  //             pdf.setPage(i);
  //             pdf.setFontSize(10);
  //           }
  //         });

  //       worker.save();
  //     }).catch(err => {
  //       console.error('Error generating PDF:', err);
  //     });
  //   } else {
  //     console.log("Error: Cannot run html2pdf outside of browser environment.");
  //   }
  // };

  const compulsorySubjects = data.subjects.filter(s => s.category === 'Compulsory');
  const electiveSubjects = data.subjects.filter(s => s.category === 'Elective');
  const additionalSubjects = data.subjects.filter(s => s.category === 'Additional');


  return (
    <div className="marksheet-print-container bg-gray-100 print:bg-white py-8 print:py-0 flex justify-center items-center flex-col">
      <Card ref={marksheetRef} className="marksheet-card w-full max-w-[210mm] min-h-[297mm] shadow-lg print:shadow-none border-4 border-black print:border-4 print:border-black my-4 print:my-0 print:mx-0 bg-white p-1 print:p-0.5 relative">
        {/* Watermark */}
        <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none">
          <Image
 src="/college-logo.png"
            alt="College Watermark"
            width={350}
            height={350}
            className="opacity-10 print:opacity-10"
            data-ai-hint="college logo"
          />
        </div>

        <div className="border border-black print:border-black p-4 print:p-[0.8cm] flex flex-col h-full relative z-10 print:border print:border-black">
          
          <header className="relative mb-1 print:mb-0.5">
 <div className="absolute top-0 right-0 text-[10px] print:text-[8pt] text-blue-600 hover:underline">
 <a
 href="http://www.saryugcollege.com"
 target="_blank"
 rel="noopener noreferrer"
 >
 www.saryugcollege.com
 </a>
            </div>
            
            <div className="flex flex-col items-center w-full mb-1 print:mb-0.5">
              <div className="relative w-full text-center">
                <div className="absolute left-0 top-[65%] transform -translate-y-1/2 ml-4 print:ml-2"> {/* Adjusted top */}
 <Image
 src="/college-logo.png"
            alt="College Logo" // Keep the alt text
 width={100} // Increased width from 70 to 100
 height={70}
 data-ai-hint="college logo"
 />
 </div>
                <div className="text-center w-full mx-auto"> {/* Center the text container */}
 <h1 className="font-serif font-bold text-2xl print:text-xl" style={{ color: '#032781' }}>SARYUG COLLEGE</h1>
                        <p className="font-sans text-sm print:text-xs text-black font-semibold">
                            Chitragupta Nagar, Mohanpur, Samastipur, Bihar - 848101
                        </p>
                        <p className="font-sans text-xs print:text-[10px] text-black">
                            Affiliated By Bihar School Examination Board | [Estd. - 1983]
                        </p> {/* Increased margin-top for space */}
                        <p className="font-sans font-bold text-xs print:text-[10px] text-black mt-0.5">College Code: {data.collegeCode}</p>
                    </div>
 </div>
            </div>

            <div className="text-center mt-6 print:mt-4 mb-3 print:mb-[0.6cm]">
              <div
                className="rounded-md inline-block mx-auto"
                style={{ backgroundColor: '#032781' }} 
              >
                <h2
                  className="text-white text-base print:text-sm font-bold uppercase px-4 py-1"
                >
                  MARKSHEET
                </h2>
              </div>
            </div>
          </header>

          <h3 className="text-center font-bold text-lg print:text-base mb-1 print:mb-0.5 text-black">Student Details</h3>
          <hr className="border-gray-300 print:border-gray-300 mb-3 print:mb-[0.6cm]" />

          <div className="mb-3 print:mb-2 grid grid-cols-2 gap-x-12 print:gap-x-16 gap-y-1 text-sm print:text-xs font-sans text-black">
            <div className="flex items-baseline justify-start text-left">
              <span className="min-w-[100px] print:min-w-[80px]">Student Name:</span> <strong className="font-semibold flex-grow text-left">{data.studentName}</strong>
            </div>
            <div className="flex items-baseline justify-end text-right w-full">
              <span className="min-w-[100px] print:min-w-[80px] text-left">Marksheet No:</span> <strong className="font-semibold flex-grow text-left">{data.marksheetNo}</strong>
            </div>
            <div className="flex items-baseline">
              <span className="min-w-[100px] print:min-w-[80px]">Father Name:</span> <strong className="font-semibold flex-grow text-left">{data.fatherName}</strong>
            </div>
            <div className="flex items-baseline justify-end text-right w-full ">
              <span className="min-w-[100px] print:min-w-[80px] text-left">Mother Name:</span> <strong className="font-semibold flex-grow text-left">{data.motherName}</strong>
            </div>
            <div className="flex items-baseline justify-start text-left">
              <span className="min-w-[100px] print:min-w-[80px]">Session:</span> <strong className="font-semibold flex-grow text-left">{data.sessionDisplay}</strong>
            </div>
            <div className="flex items-baseline justify-end text-right w-full ">
              <span className="min-w-[100px] print:min-w-[80px] text-left">Roll No:</span> <strong className="font-semibold flex-grow text-left">{data.rollNumber}</strong>
            </div>
            <div className="flex items-baseline justify-start text-left">
              <span className="min-w-[100px] print:min-w-[80px]">Date of Birth:</span> <strong className="font-semibold flex-grow text-left">{format(new Date(data.dateOfBirth), "dd-MM-yyyy")}</strong>
            </div>
            <div className="flex items-baseline justify-end text-right w-full ">
              <span className="min-w-[100px] print:min-w-[80px] text-left">Faculty:</span> <strong className="font-semibold flex-grow text-left">{data.faculty}</strong>
            </div>
            <div className="flex items-baseline justify-start text-left">
              <span className="min-w-[100px] print:min-w-[80px]">Class:</span> <strong className="font-semibold flex-grow text-left">{data.classDisplay}</strong>
            </div>
            <div className="flex items-baseline justify-end text-right w-full ">
              <span className="min-w-[100px] print:min-w-[80px] text-left">Gender:</span> <strong className="font-semibold flex-grow text-left">{data.gender}</strong>
            </div>
          </div>

          <div className="flex-grow flex flex-col -mt-1 print:-mt-0.5">
            <section className="my-3 print:my-[0.5cm]">
 <div className="overflow-x-hidden print:overflow-x-hidden">
                <Table className="border-collapse w-full text-black print:text-black text-xs print:text-[9px] bg-transparent print:bg-transparent">
                    <TableHeader className="bg-gray-100 print:bg-transparent hover:bg-gray-100 print:hover:bg-transparent">
                        <TableRow className="border-b border-black bg-transparent print:bg-transparent hover:bg-transparent print:hover:bg-transparent dark:hover:bg-inherit print:h-[20px]"> {/* Added print height */}
                            <TableHead rowSpan={2} className="w-[8%] text-center border border-black font-bold text-black align-middle p-1 print:p-0.5 text-base print:text-[11px]">
                                Sr. No.</TableHead> {/* Increased font size */}
                            <TableHead rowSpan={2} className="min-w-[25%] border border-black font-bold text-black text-center align-middle p-1 print:p-0.5 text-base print:text-[11px]">Subject</TableHead>
                            <TableHead rowSpan={2} className="w-[12%] text-center border border-black font-bold text-black align-middle p-1 print:p-0.5 text-base print:text-[11px]">Total Marks</TableHead>
                            <TableHead rowSpan={2} className="w-[12%] text-center border border-black font-bold text-black align-middle p-1 print:p-0.5 text-base print:text-[11px]">Passing Marks</TableHead>
                            <TableHead colSpan={2} className="text-center border border-black font-bold text-black align-middle p-1 print:p-0.5 text-base print:text-[11px]">Marks Obtained</TableHead>
                            <TableHead rowSpan={2} className="w-[12%] text-center border border-black font-bold text-black align-middle p-1 print:p-0.5 text-base print:text-[11px]">Total</TableHead>
                        </TableRow>
                        <TableRow className="border-b border-black bg-transparent print:bg-transparent hover:bg-transparent print:hover:bg-transparent dark:hover:bg-inherit font-bold text-black text-sm print:text-[11px]"> {/* Increased font size */}
                            <TableHead className="text-center border border-black font-bold text-black align-middle p-1 print:p-0.5 text-xs print:text-[11px]">Theory</TableHead>
                            <TableHead className="text-center border border-black font-bold text-black align-middle p-1 print:p-0.5 text-xs print:text-[11px]">Practical</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody className="text-xs print:text-[9px]"> {/* Set default font size for body */}
 {compulsorySubjects.length > 0 && (
                            <TableRow className="font-bold bg-gray-50 print:bg-gray-50 hover:bg-gray-50 print:hover:bg-gray-50 dark:hover:bg-inherit">
                                <TableCell 
                                    colSpan={7}
                                    className="border border-black py-0.5 px-1 print:py-0.25 print:px-0.5 text-left text-xs print:text-[10px] text-black"
                                >
                                    COMPULSORY SUBJECTS
                                </TableCell>
                            </TableRow>
 )}
                        {compulsorySubjects.map((subject, index) => ( 
                            <TableRow key={`comp-${index}`} className="border-b border-black h-[22px] print:h-[20px] hover:bg-transparent print:hover:bg-transparent dark:hover:bg-inherit"> {/* Removed redundant text-xs */}
                                <TableCell className="text-center border border-black p-1 print:p-0.5">{index + 1}</TableCell>
                                <TableCell className="border border-black p-1 print:p-0.5 text-left bg-transparent print:bg-transparent">{subject.subjectName}</TableCell>
                                <TableCell className="text-center border border-black p-1 print:p-0.5">{subject.totalMarks}</TableCell>
                                <TableCell className="text-center border border-black p-1 print:p-0.5">{subject.passMarks}</TableCell>
                                <TableCell className="text-center border border-black p-1 print:p-0.5">{subject.theoryMarksObtained}</TableCell>
                                <TableCell className="text-center border border-black p-1 print:p-0.5">{subject.practicalMarksObtained}</TableCell>
                                <TableCell className="text-center border border-black p-1 print:p-0.5 font-bold">{subject.obtainedTotal}</TableCell>
                            </TableRow>
                        ))}

 {electiveSubjects.length > 0 && (
                            <TableRow className="font-bold bg-gray-50 print:bg-gray-50 hover:bg-gray-50 print:hover:bg-gray-50 dark:hover:bg-inherit">
                                 <TableCell
                                    colSpan={7}
                                    className="border border-black py-0.5 px-1 print:py-0.25 print:px-0.5 text-left text-xs print:text-[10px] text-black"
                                >
                                    ELECTIVE SUBJECTS
                                </TableCell>
                            </TableRow>
 )}
                       {electiveSubjects.map((subject, index) => (
                            <TableRow key={`elec-${index}`} className="border-b border-black h-[22px] print:h-[20px] hover:bg-transparent print:hover:bg-transparent dark:hover:bg-inherit"> {/* Removed redundant text-xs */}
                                <TableCell className="text-center border border-black p-1 print:p-0.5">{compulsorySubjects.length + index + 1}</TableCell>
                                <TableCell className="border border-black p-1 print:p-0.5 text-left">{subject.subjectName}</TableCell>
                                <TableCell className="text-center border border-black p-1 print:p-0.5">{subject.totalMarks}</TableCell>
                                <TableCell className="text-center border border-black p-1 print:p-0.5">{subject.passMarks}</TableCell>
                                <TableCell className="text-center border border-black p-1 print:p-0.5">{subject.theoryMarksObtained}</TableCell>
                                <TableCell className="text-center border border-black p-1 print:p-0.5">{subject.practicalMarksObtained}</TableCell>
                                <TableCell className="text-center border border-black p-1 print:p-0.5 font-bold">{subject.obtainedTotal}</TableCell>
                            </TableRow>
                        ))}

 {additionalSubjects.length > 0 && (
                            <TableRow className="font-bold bg-gray-50 print:bg-gray-50 hover:bg-gray-50 print:hover:bg-gray-50 dark:hover:bg-inherit"> 
                                 <TableCell
                                    colSpan={7}
                                    className="border border-black py-0.5 px-1 print:py-0.25 print:px-0.5 text-left text-xs print:text-[10px] text-black"
                                >
                                    ADDITIONAL SUBJECTS
                                </TableCell>
                            </TableRow>
 )}
                        {additionalSubjects.map((subject, index) => (
                            <TableRow key={`addl-${index}`} className="border-b border-black h-[22px] print:h-[20px] hover:bg-transparent print:hover:bg-transparent dark:hover:bg-inherit"> {/* Removed redundant text-xs */}
                                <TableCell className="text-center border border-black p-1 print:p-0.5">{compulsorySubjects.length + electiveSubjects.length + index + 1}</TableCell>
                                <TableCell className="border border-black p-1 print:p-0.5 text-left bg-transparent print:bg-transparent">{subject.subjectName}</TableCell>
                                <TableCell className="text-center border border-black p-1 print:p-0.5">{subject.totalMarks}</TableCell>
                                <TableCell className="text-center border border-black p-1 print:p-0.5">{subject.passMarks}</TableCell>
                                <TableCell className="text-center border border-black p-1 print:p-0.5">{subject.theoryMarksObtained}</TableCell>
                                <TableCell className="text-center border border-black p-1 print:p-0.5">{subject.practicalMarksObtained}</TableCell>
                                <TableCell className="text-center border border-black p-1 print:p-0.5 font-bold">{subject.obtainedTotal}</TableCell>
                            </TableRow>
 ))}
                        <TableRow className="border-t-2 border-black h-[24px] print:h-[22px] hover:bg-transparent print:hover:bg-transparent dark:hover:bg-inherit"> 
                            <TableCell colSpan={6} className="text-right border-l border-r border-b border-black p-1 print:p-0.5 pr-2 print:pr-1.5 font-bold text-sm print:text-xs text-black">AGGREGATE (Compulsory + Elective)</TableCell> 
                            <TableCell className="text-center border-r border-b border-black p-1 print:p-0.5 font-bold text-sm print:text-xs text-black">{data.aggregateMarksCompulsoryElective}</TableCell>
                        </TableRow>
                    </TableBody> 
                </Table>
                </div>
            </section>
            
            <div className="mt-4 print:mt-3 mb-2 print:mb-1 text-sm print:text-xs text-black">
                <div className="mb-1 print:mb-0.5">Result: <strong className={cn("font-semibold", data.overallResult === "Pass" ? "text-green-600 print:text-green-600" : "text-red-600 print:text-red-600")}>{data.overallResult} ({data.overallPercentageDisplay.toFixed(2)}%)</strong></div>
                <div className="flex justify-between items-center">
                    <div>Place: <strong className="font-semibold">{data.place}</strong></div>
                    <div className="text-right">Date of Issue: <strong className="font-semibold">{data.dateOfIssue}</strong></div>
                </div>
            </div>
          </div> 

          <div className="mt-auto pt-10 print:pt-[1cm] text-xs print:text-[9px] text-black">
                <div className="flex justify-between">
                    <div className="text-center">
                        <hr className="border-black print:border-black mb-1 w-48 mx-auto" />
                        Sign of Counter Clerk
                    </div>
                    <div className="text-center">
                        <hr className="border-black print:border-black mb-1 w-48 mx-auto" />
                        Sign of Principal
                    </div>
                </div>
            </div>

        </div>
      </Card>

      <div className="flex flex-col sm:flex-row justify-center gap-3 p-4 print:hidden mt-4 text-center">
        {onEditBack && (
          <Button variant="outline" onClick={onEditBack}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Edit Form
          </Button>
        )}
        {onCreateNew && (
          <Button variant="outline" onClick={onCreateNew}>
            <FilePlus2 className="mr-2 h-4 w-4" /> Create New
          </Button>
        )}
        <Button variant="outline" onClick={handleDownloadImage}>
 <ImageIcon className="mr-2 h-4 w-4" /> Download Image
        </Button>
        <Button onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" /> Print Marksheet
        </Button>
      </div>

      <style jsx global>{`
        @media print {
          body, html {
            height: 100%; 
            margin: 0 !important;
            padding: 0 !important;
            background-color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-sizing: border-box;
          }
          .marksheet-print-container {
             width: 100%;
             height: 100%;
             padding: 0 !important; 
             margin: 0 !important;
             display: flex !important;
             align-items: stretch !important; 
             justify-content: stretch !important; 
          }
          .marksheet-card {
            width: 100% !important;
            height: 100% !important;
            min-height: 0 !important; /* Reset min-height for print */
            max-width: none !important;
            box-sizing: border-box !important;
            display: flex !important;
            flex-direction: column !important;
            page-break-inside: avoid !important;
            border-width: 4px !important; 
            border-color: black !important;
            padding: 0.5pt !important; /* Space for outer border thickness */
            margin: 0 !important; 
            background-color: white !important;
          }
          .marksheet-card > div:first-child { /* Inner content div */
             padding: 0.8cm !important; /* Inner padding from the drawn inner border */
             border-width: 1px !important;
             border-color: black !important;
             margin: 0 !important;
             height: 100% !important; 
             display: flex !important;
             flex-direction: column !important;
             box-sizing: border-box !important;
          }

          /* General print helper classes */
          .print\\:p-\\[0\\.8cm\\] { padding: 0.8cm !important; } 
          .print\\:mb-\\[0\\.6cm\\] { margin-bottom: 0.6cm !important; }
 .print\\:my-\\[0\\.5cm\\] {
 margin-top: 0.5cm !important;
 margin-bottom: 0.5cm !important;
 }
          .print\\:pt-\\[1cm\\] { padding-top: 1cm !important; } 


          .print\\:border-black { border-color: black !important; }
          .print\\:border-gray-300 { border-color: #D1D5DB !important; }
          .print\\:border-4 { border-width: 4px !important; } 
          .print\\:border { border-width: 1px !important; }

          .print\\:text-black { color: black !important; }
          .print\\:bg-gray-50 { background-color: #F9FAFB !important; }
          .print\\:bg-gray-100 { background-color: #F3F4F6 !important; }
          .print\\:bg-white { background-color: white !important; }
          .print\\:text-green-600 { color: #16A34A !important; }
          .print\\:text-red-600 { color: #DC2626 !important; }

          /* Font sizes using pt for print */
          .print\\:text-\\[10px\\] { font-size: 8pt !important; line-height: 1.2 !important;}
          .print\\:text-\\[9px\\] { font-size: 7pt !important; line-height: 1.2 !important;}
          .print\\:text-\\[8pt\\] { font-size: 8pt !important; line-height: 1.1 !important;} /* Example, adjust as needed */
          .print\\:text-xs { font-size: 8pt !important; line-height: 1.2 !important; } 
          .print\\:text-sm { font-size: 9pt !important; line-height: 1.2 !important; } 
          .print\\:text-base { font-size: 10pt !important; line-height: 1.2 !important; } 
          .print\\:text-lg { font-size: 11pt !important; line-height: 1.2 !important; } 
          .print\\:text-xl { font-size: 12pt !important; line-height: 1.2 !important; } 
          .print\\:text-2xl { font-size: 14pt !important; line-height: 1.2 !important; } 


          .print\\:mb-0 { margin-bottom: 0 !important; }
          .print\\:mb-0\\.5 { margin-bottom: 2pt !important; } 
          .print\\:mb-1 { margin-bottom: 4pt !important; } 
          .print\\:mb-1\\.5 { margin-bottom: 6pt !important; } 
          .print\\:mb-2 { margin-bottom: 8pt !important; } 
          .print\\:mt-0 { margin-top: 0 !important; }
          .print\\:mt-0\\.5 { margin-top: 2pt !important; } 
          .print\\:mt-1 { margin-top: 4pt !important; } 
          .print\\:mt-1\\.5 { margin-top: 6pt !important; } 
          .print\\:pt-0 { padding-top: 0 !important; }
          .print\\:pt-2 { padding-top: 8pt !important; } 
          .print\\:pt-6 { padding-top: 1.5cm !important; } /* Approx 0.6cm */
          .print\\:pt-\\[1cm\\] { padding-top: 1cm !important;} /* Approx 1cm */
          .print\\:p-0\\.5 {padding: 2pt !important;}
          .print\\:p-1 {padding: 4pt !important;}
          .print\\:p-0\\.25 {padding: 1pt !important;}


          .print\\:shadow-none { box-shadow: none !important; }
          
          table, th, td {
 overflow: visible !important; /* Prevent scrollbars */
 white-space: normal !important; /* Allow text wrapping */
 word-break: break-word !important; /* Break long words */
 max-width: none !important; /* Remove max width constraints */
            border: 1px solid black !important; 
            border-collapse: collapse !important;
            page-break-inside: auto !important;
            background-color: transparent !important; 
          }
          tr.font-bold td.bg-gray-50 { 
            background-color: #F9FAFB !important;
          }
          hr.print\\:border-black {
            border-color: black !important;
            border-top-width: 1px !important;
          }
          hr.print\\:border-gray-300 {
            border-color: #D1D5DB !important;
            border-top-width: 1px !important;
          }
          .print\\:h-\\[20px\\] { height: 20px !important; }
          .print\\:h-\\[18px\\] { height: 18px !important; }

 .overflow-x-hidden {
 overflow-x: hidden !important; /* Hide overflow in preview */
 }
 .overflow-x-visible { overflow-x: visible; }

          @page {
            size: A4 portrait;
            margin: 1.5cm 1.2cm 1.5cm 1.2cm; /* T R B L */ /* Original margin, adjust as needed if changing inner padding affects layout */
          }
        }
      `}</style>
    </div>
  );
}

    