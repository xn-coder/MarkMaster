
'use client';

import type * as React from 'react';
import type { MarksheetDisplayData } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Printer, FilePlus2 } from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface MarksheetDisplayProps {
  data: MarksheetDisplayData;
  onCreateNew?: () => void;
  isViewMode?: boolean;
}

export function MarksheetDisplay({ data, onCreateNew, isViewMode = false }: MarksheetDisplayProps) {
  const handlePrint = () => {
    window.print();
  };

  const compulsorySubjects = data.subjects.filter(s => s.category === 'Compulsory');
  const electiveSubjects = data.subjects.filter(s => s.category === 'Elective');
  const additionalSubjects = data.subjects.filter(s => s.category === 'Additional');

  return (
    <div className="print:p-0 print:m-0 bg-gray-100 print:bg-white py-8 print:py-0 flex justify-center">
      <Card className="w-full max-w-[210mm] min-h-[297mm] mx-auto shadow-lg print:shadow-none border-2 border-black print:border-2 print:border-black my-4 print:my-0 print:mx-0 bg-white p-1 print:p-0.5 relative">
        {/* Watermark */}
        <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none">
          <Image
            src="/college-logo.png"
            alt="College Watermark"
            width={350} 
            height={350}
            className="opacity-5 print:opacity-5"
            data-ai-hint="college logo"
          />
        </div>

        <div className="border border-black print:border-black p-3 print:p-2.5 flex-grow flex flex-col h-full relative z-10"> {/* Content above watermark */}
          
          <header className="mb-1 print:mb-0.5 relative h-[110px] print:h-[100px]"> {/* Adjusted height for header */}
            <div className="absolute top-1 right-1 print:top-0.5 print:right-0.5">
              <a 
                href="http://www.saryugcollege.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="font-sans text-[10px] print:text-[8px] text-blue-600 hover:underline"
              >
                www.saryugcollege.com
              </a>
            </div>
            
            <div className="absolute top-3 left-4 print:top-2 print:left-3 z-20"> {/* Logo z-index if needed */}
                <Image 
                    src="/college-logo.png"
                    alt="College Logo" 
                    width={70} 
                    height={70}
                    className=""
                    data-ai-hint="college logo" 
                />
            </div>

            <div className="absolute left-1/2 top-3 print:top-2 transform -translate-x-1/2 w-full px-20 print:px-16"> {/* College details block */}
                <div className="text-center">
                    <h1 className="font-serif font-bold text-xl print:text-lg" style={{ color: '#032781' }}>SARYUG COLLEGE</h1>
                    <p className="font-sans text-xs print:text-[10px] text-black font-semibold">
                      Chitragupta Nagar, Mohanpur, Samastipur, Bihar - 848101
                    </p>
                    <p className="font-sans text-[10px] print:text-[9px] text-black">
                      Affiliated By Bihar School Examination Board | [Estd. - 1983]
                    </p>
                    <p className="font-sans font-bold text-[10px] print:text-[9px] text-black mt-0.5">College Code: {data.collegeCode}</p>
                </div>
            </div>
            
            <div 
              className="absolute left-1/2 transform -translate-x-1/2 text-center rounded-md inline-block mx-auto"
              style={{ backgroundColor: '#DB2A2A', top: '80px' }} // Adjusted top to be below college details
            >
              <h2 
                className="text-white text-base print:text-sm font-bold uppercase px-4 py-1" // Added padding to banner
              >
                MARKSHEET
              </h2>
            </div>
          </header>

          <h3 className="text-center font-bold text-lg print:text-base underline decoration-1 underline-offset-2 mb-2 print:mb-1.5 text-black mt-3 print:mt-2">Student Details</h3>
          
          <div className="mb-2 print:mb-1.5 grid grid-cols-2 gap-x-6 gap-y-1 text-sm print:text-xs font-sans text-black">
            <div>Student Name: <strong className="font-semibold">{data.studentName}</strong></div>
            <div className="text-right">Marksheet No: <strong className="font-semibold">{data.marksheetNo}</strong></div>
            
            <div>Father Name: <strong className="font-semibold">{data.fatherName}</strong></div>
            <div className="text-right">Mother Name: <strong className="font-semibold">{data.motherName}</strong></div>

            <div>Session: <strong className="font-semibold">{data.sessionDisplay}</strong></div>
            <div className="text-right">Roll No: <strong className="font-semibold">{data.rollNumber}</strong></div>
            
            <div>Date of Birth: <strong className="font-semibold">{format(new Date(data.dateOfBirth), "dd-MM-yyyy")}</strong></div>
            <div className="text-right">Gender: <strong className="font-semibold">{data.gender}</strong></div>
            
            <div>Faculty: <strong className="font-semibold">{data.faculty}</strong></div>
            <div className="text-right">Class: <strong className="font-semibold">{data.classDisplay}</strong></div>
          </div>
          
          <hr className="border-black print:border-black my-2 print:my-1.5" />


          <section className="flex-grow flex flex-col mb-2 print:mb-1.5">
            <div className="overflow-x-auto flex-grow">
              <Table className="border border-black border-collapse w-full text-xs print:text-[10px]">
                <TableHeader className="bg-gray-100 print:bg-gray-100">
                  <TableRow className="border-b border-black hover:bg-transparent print:hover:bg-transparent dark:hover:bg-inherit">
                    <TableHead className="w-[8%] border border-black font-bold text-black text-center align-middle p-0.5 print:p-0.25">Sr. no.</TableHead>
                    <TableHead className="min-w-[25%] border border-black font-bold text-black text-center align-middle p-0.5 print:p-0.25">Subject</TableHead>
                    <TableHead className="w-[12%] text-center border border-black font-bold text-black align-middle p-0.5 print:p-0.25">Total Marks</TableHead>
                    <TableHead className="w-[12%] text-center border border-black font-bold text-black align-middle p-0.5 print:p-0.25">Passing Marks</TableHead>
                    <TableHead colSpan={2} className="w-[24%] text-center border border-black font-bold text-black align-middle p-0.5 print:p-0.25">Marks Obtained</TableHead>
                    <TableHead className="w-[14%] text-center border border-black font-bold text-black align-middle p-0.5 print:p-0.25">Total</TableHead>
                  </TableRow>
                  <TableRow className="border-b border-black bg-gray-100 print:bg-gray-100 hover:bg-transparent print:hover:bg-transparent dark:hover:bg-inherit">
                    <TableHead className="border border-black p-0.5 print:p-0.25"></TableHead>
                    <TableHead className="border border-black p-0.5 print:p-0.25"></TableHead>
                    <TableHead className="border border-black p-0.5 print:p-0.25"></TableHead>
                    <TableHead className="border border-black p-0.5 print:p-0.25"></TableHead>
                    <TableHead className="text-center border border-black font-bold text-black align-middle p-0.5 print:p-0.25 text-xs print:text-[9px]">Theory</TableHead>
                    <TableHead className="text-center border border-black font-bold text-black align-middle p-0.5 print:p-0.25 text-xs print:text-[9px]">Practical</TableHead>
                    <TableHead className="border border-black p-0.5 print:p-0.25"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {compulsorySubjects.length > 0 && (
                    <TableRow className="font-bold bg-transparent hover:bg-transparent print:hover:bg-transparent dark:hover:bg-inherit">
                      <TableCell colSpan={7} className="border-x border-black p-1 print:p-0.5 text-left text-xs print:text-[10px] mt-1 text-black">COMPULSORY SUBJECTS</TableCell>
                    </TableRow>
                  )}
                  {compulsorySubjects.map((subject, index) => (
                    <TableRow key={`comp-${index}`} className="border-b border-black h-[22px] print:h-[20px] hover:bg-transparent print:hover:bg-transparent dark:hover:bg-inherit text-xs print:text-[9px]">
                      <TableCell className="text-center border border-black p-0.5 print:p-0.25 text-black">{index + 1}</TableCell>
                      <TableCell className="border border-black p-0.5 print:p-0.25 text-left text-black">{subject.subjectName}</TableCell>
                      <TableCell className="text-right border border-black p-0.5 print:p-0.25 text-black">{subject.totalMarks}</TableCell>
                      <TableCell className="text-right border border-black p-0.5 print:p-0.25 text-black">{subject.passMarks}</TableCell>
                      <TableCell className="text-right border border-black p-0.5 print:p-0.25 text-black">{subject.theoryMarksObtained}</TableCell>
                      <TableCell className="text-right border border-black p-0.5 print:p-0.25 text-black">{subject.practicalMarksObtained}</TableCell>
                      <TableCell className="text-right border border-black p-0.5 print:p-0.25 font-bold text-black">{subject.obtainedTotal}</TableCell>
                    </TableRow>
                  ))}
                  
                  {electiveSubjects.length > 0 && (
                    <TableRow className="font-bold bg-transparent hover:bg-transparent print:hover:bg-transparent dark:hover:bg-inherit">
                      <TableCell colSpan={7} className="border-x border-black p-1 print:p-0.5 text-left text-xs print:text-[10px] mt-1 text-black">ELECTIVE SUBJECTS</TableCell>
                    </TableRow>
                  )}
                  {electiveSubjects.map((subject, index) => (
                    <TableRow key={`elec-${index}`} className="border-b border-black h-[22px] print:h-[20px] hover:bg-transparent print:hover:bg-transparent dark:hover:bg-inherit text-xs print:text-[9px]">
                      <TableCell className="text-center border border-black p-0.5 print:p-0.25 text-black">{compulsorySubjects.length + index + 1}</TableCell>
                      <TableCell className="border border-black p-0.5 print:p-0.25 text-left text-black">{subject.subjectName}</TableCell>
                      <TableCell className="text-right border border-black p-0.5 print:p-0.25 text-black">{subject.totalMarks}</TableCell>
                      <TableCell className="text-right border border-black p-0.5 print:p-0.25 text-black">{subject.passMarks}</TableCell>
                      <TableCell className="text-right border border-black p-0.5 print:p-0.25 text-black">{subject.theoryMarksObtained}</TableCell>
                      <TableCell className="text-right border border-black p-0.5 print:p-0.25 text-black">{subject.practicalMarksObtained}</TableCell>
                      <TableCell className="text-right border border-black p-0.5 print:p-0.25 font-bold text-black">{subject.obtainedTotal}</TableCell>
                    </TableRow>
                  ))}

                  {additionalSubjects.length > 0 && (
                     <TableRow className="font-bold bg-transparent hover:bg-transparent print:hover:bg-transparent dark:hover:bg-inherit">
                      <TableCell colSpan={7} className="border-x border-black p-1 print:p-0.5 text-left text-xs print:text-[10px] mt-1 text-black">ADDITIONAL SUBJECTS</TableCell>
                    </TableRow>
                  )}
                   {additionalSubjects.map((subject, index) => (
                    <TableRow key={`add-${index}`} className="border-b border-black h-[22px] print:h-[20px] hover:bg-transparent print:hover:bg-transparent dark:hover:bg-inherit text-xs print:text-[9px]">
                      <TableCell className="text-center border border-black p-0.5 print:p-0.25 text-black">{compulsorySubjects.length + electiveSubjects.length + index + 1}</TableCell>
                      <TableCell className="border border-black p-0.5 print:p-0.25 text-left text-black">{subject.subjectName} (Addl.)</TableCell>
                      <TableCell className="text-right border border-black p-0.5 print:p-0.25 text-black">{subject.totalMarks}</TableCell>
                      <TableCell className="text-right border border-black p-0.5 print:p-0.25 text-black">{subject.passMarks}</TableCell>
                      <TableCell className="text-right border border-black p-0.5 print:p-0.25 text-black">{subject.theoryMarksObtained}</TableCell>
                      <TableCell className="text-right border border-black p-0.5 print:p-0.25 text-black">{subject.practicalMarksObtained}</TableCell>
                      <TableCell className="text-right border border-black p-0.5 print:p-0.25 font-bold text-black">{subject.obtainedTotal}</TableCell>
                    </TableRow>
                  ))}
                  
                  <TableRow className="border-t-2 border-black h-[26px] print:h-[24px] hover:bg-transparent print:hover:bg-transparent dark:hover:bg-inherit font-bold text-sm print:text-xs">
                    <TableCell colSpan={6} className="text-right border-x border-black p-1 print:p-0.5 pr-2 print:pr-1.5 text-black">AGGREGATE (Compulsory + Elective)</TableCell>
                    <TableCell className="text-right border border-black p-1 print:p-0.5 text-black">{data.aggregateMarksCompulsoryElective}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </section>
          
          <div className="mt-2 print:mt-1.5 text-sm print:text-xs text-black">
            <div className="flex justify-between items-center">
                <div>Result: <strong className={cn("font-bold", data.overallResult === "Pass" ? "text-green-600 print:text-green-600" : "text-red-600 print:text-red-600")}>{data.overallResult} ({data.overallPercentageDisplay.toFixed(2)}%)</strong></div>
                <div className="text-right">Place: <strong className="font-bold">{data.place}</strong></div>
            </div>
            <div className="text-right mt-1">Date of Issue: <strong className="font-bold">{data.dateOfIssue}</strong></div>
          </div>
          
          <div className="mt-auto pt-10 print:pt-8 text-xs print:text-[10px] text-black"> {/* Increased pt for more space */}
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

      <div className="flex flex-col sm:flex-row justify-center gap-3 p-4 print:hidden mt-4">
        {!isViewMode && onCreateNew && (
          <Button variant="outline" onClick={onCreateNew}>
            <FilePlus2 className="mr-2 h-4 w-4" /> Create New
          </Button>
        )}
        <Button variant="outline" onClick={() => alert('PDF Download to be implemented.')}>
          <Download className="mr-2 h-4 w-4" /> Download PDF
        </Button>
        <Button onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" /> Print Marksheet
        </Button>
      </div>

      <style jsx global>{`
        @media print {
          body, html {
            margin: 0 !important;
            padding: 0 !important;
            background-color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print\\:p-0 { padding: 0 !important; }
          .print\\:m-0 { margin: 0 !important; }
          .print\\:p-0\\.5 { padding: 2pt !important; } 
          .print\\:p-0\\.25 { padding: 1pt !important; }
          .print\\:p-1 { padding: 4pt !important; } 
          .print\\:p-1\\.5 { padding: 6pt !important; } 
          .print\\:p-2\\.5 { padding: 0.625rem !important; } 
          .print\\:p-3 { padding: 0.75rem !important; }


          .print\\:border-black { border-color: black !important; }
          .print\\:border-2 { border-width: 2px !important; }
          .print\\:border { border-width: 1px !important; }
          
          .print\\:text-black { color: black !important; }
          .print\\:bg-gray-100 { background-color: #F3F4F6 !important; } 
          .print\\:bg-white { background-color: white !important; }
          .print\\:text-green-600 { color: #16A34A !important; } /* Tailwind green-600 */
          .print\\:text-red-600 { color: #DC2626 !important; } /* Tailwind red-600 */
          
          .print\\:text-\\[10px\\] { font-size: 10pt !important; line-height: 1.2 !important;}
          .print\\:text-\\[9px\\] { font-size: 9pt !important; line-height: 1.2 !important;}
          .print\\:text-\\[8px\\] { font-size: 8pt !important; line-height: 1.2 !important;}
          .print\\:text-xs { font-size: 10pt !important; line-height: 1.3 !important; } 
          .print\\:text-sm { font-size: 11pt !important; line-height: 1.3 !important; } 
          .print\\:text-base { font-size: 12pt !important; line-height: 1.3 !important; } 
          .print\\:text-lg { font-size: 14pt !important; line-height: 1.3 !important; } 
          .print\\:text-xl { font-size: 16pt !important; line-height: 1.3 !important; } 

          .print\\:mb-0\\.5 { margin-bottom: 2pt !important; }
          .print\\:mb-1 { margin-bottom: 4pt !important; }
          .print\\:mb-1\\.5 { margin-bottom: 6pt !important; }
          .print\\:mb-2 { margin-bottom: 8pt !important; }
          .print\\:mt-0\\.5 { margin-top: 2pt !important; }
          .print\\:mt-1 { margin-top: 4pt !important; }
          .print\\:mt-1\\.5 { margin-top: 6pt !important; }
          .print\\:mt-2 { margin-top: 8pt !important; }
          .print\\:mt-3 { margin-top: 0.75rem !important; }
          .print\\:pt-0 { padding-top: 0 !important; }
          .print\\:pt-8 { padding-top: 2rem !important; }
          .print\\:pt-10 { padding-top: 2.5rem !important; }


          .print\\:shadow-none { box-shadow: none !important; }
          
          .max-w-\\[210mm\\].min-h-\\[297mm\\] { 
            width: 100% !important; 
            height: auto !important; 
            min-height: calc(297mm - 20mm) !important; /* A4 height minus typical margins */
            max-width: none !important; 
            box-sizing: border-box !important;
            display: flex !important;
            flex-direction: column !important;
            page-break-inside: avoid !important;
            border-width: 2px !important;
            border-color: black !important;
          }
          .border.border-black.p-3.print\\:p-2\\.5 { /* Inner content wrapper */
             padding: 0.625rem !important; /* approx 2.5mm */
             border-width: 1px !important;
             border-color: black !important;
             margin: 0 !important; 
             height: 100%;
             display: flex;
             flex-direction: column;
          }
          
          table, th, td {
             border: 1px solid black !important;
             border-collapse: collapse !important; 
             page-break-inside: avoid !important;
          }
          thead.print\\:bg-gray-100 tr th { 
            background-color: #F3F4F6 !important; 
          }
          tr.font-bold.bg-transparent td { 
             background-color: transparent !important;
           }
          hr.print\\:border-black {
            border-color: black !important;
            border-top-width: 1px !important;
          }

          @page {
            size: A4 portrait;
            margin: 10mm; 
          }
        }
      `}</style>
    </div>
  );
}

    