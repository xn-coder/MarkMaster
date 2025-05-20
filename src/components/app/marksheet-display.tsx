
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
    <div className="marksheet-print-container bg-gray-100 print:bg-white py-8 print:py-0 flex justify-center">
      <Card className="marksheet-card w-full max-w-[210mm] min-h-[297mm] mx-auto shadow-lg print:shadow-none border-4 border-black print:border-4 print:border-black my-4 print:my-0 print:mx-0 bg-white p-1 print:p-0.5 relative">
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

        <div className="border border-black print:border-black p-4 print:p-[0.5cm] flex flex-col h-full relative z-10">
          
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
                <div className="flex items-center justify-center w-full">
                    <div className="flex-shrink-0 mr-3 print:mr-2">
                    <Image
                        src="/college-logo.png"
                        alt="College Logo"
                        width={70} 
                        height={70}
                        className=""
                        data-ai-hint="college logo"
                    />
                    </div>
                    <div className="text-left">
                        <h1 className="font-serif font-bold text-2xl print:text-xl" style={{ color: '#032781' }}>SARYUG COLLEGE</h1>
                        <p className="font-sans text-sm print:text-xs text-black font-semibold">
                            Chitragupta Nagar, Mohanpur, Samastipur, Bihar - 848101
                        </p>
                        <p className="font-sans text-xs print:text-[10px] text-black">
                            Affiliated By Bihar School Examination Board | [Estd. - 1983]
                        </p>
                        <p className="font-sans font-bold text-xs print:text-[10px] text-black mt-0.5">College Code: {data.collegeCode}</p>
                    </div>
                </div>
            </div>

            <div className="text-center mt-2 print:mt-1 mb-3 print:mb-[0.6cm]">
              <div
                className="rounded-md inline-block mx-auto"
                style={{ backgroundColor: '#DB2A2A' }} 
              >
                <h2
                  className="text-white text-base print:text-sm font-bold uppercase px-4 py-1"
                >
                  MARKSHEET
                </h2>
              </div>
            </div>
          </header>

          <h3 className="text-center font-bold text-lg print:text-base underline decoration-1 underline-offset-2 mb-3 print:mb-[0.6cm] text-black">Student Details</h3>
          
          <div className="mb-3 print:mb-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm print:text-xs font-sans text-black">
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
          
          <div className="flex-grow flex flex-col">
            <section className="my-2 print:my-[0.5cm]">
                <div className="overflow-x-auto">
                <Table className="border-collapse w-full">
                    <TableHeader className="bg-gray-100 print:bg-gray-100">
                        <TableRow className="border-b border-black bg-gray-100 print:bg-gray-100 hover:bg-transparent print:hover:bg-transparent dark:hover:bg-inherit">
                            <TableHead className="w-[8%] border border-black font-bold text-black text-center align-middle p-1 print:p-1 text-xs print:text-[9px]">Sr. no.</TableHead>
                            <TableHead className="min-w-[25%] border border-black font-bold text-black text-center align-middle p-1 print:p-1 text-xs print:text-[9px]">Subject</TableHead>
                            <TableHead className="w-[12%] text-center border border-black font-bold text-black align-middle p-1 print:p-1 text-xs print:text-[9px]">Total Marks</TableHead>
                            <TableHead className="w-[12%] text-center border border-black font-bold text-black align-middle p-1 print:p-1 text-xs print:text-[9px]">Passing Marks</TableHead>
                            <TableHead colSpan={2} className="w-[24%] text-center border border-black font-bold text-black align-middle p-1 print:p-1 text-xs print:text-[9px]">Marks Obtained</TableHead>
                            <TableHead className="w-[14%] text-center border border-black font-bold text-black align-middle p-1 print:p-1 text-xs print:text-[9px]">Total</TableHead>
                        </TableRow>
                        <TableRow className="border-b border-black bg-gray-100 print:bg-gray-100 hover:bg-transparent print:hover:bg-transparent dark:hover:bg-inherit">
                            <TableHead className="border border-black p-1 print:p-1"></TableHead>
                            <TableHead className="border border-black p-1 print:p-1"></TableHead>
                            <TableHead className="border border-black p-1 print:p-1"></TableHead>
                            <TableHead className="border border-black p-1 print:p-1"></TableHead>
                            <TableHead className="text-center border border-black font-bold text-black align-middle p-1 print:p-1 text-xs print:text-[9px]">Theory</TableHead>
                            <TableHead className="text-center border border-black font-bold text-black align-middle p-1 print:p-1 text-xs print:text-[9px]">Practical</TableHead>
                            <TableHead className="border border-black p-1 print:p-1"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {compulsorySubjects.length > 0 && (
                            <TableRow className="font-bold bg-transparent hover:bg-transparent print:hover:bg-transparent dark:hover:bg-inherit">
                                <TableCell
                                    colSpan={7}
                                    className="border border-black bg-gray-50 print:bg-gray-50 py-0.5 px-1 print:py-0.25 print:px-0.5 text-left text-xs print:text-[10px] text-black"
                                >
                                    COMPULSORY SUBJECTS
                                </TableCell>
                            </TableRow>
                        )}
                        {compulsorySubjects.map((subject, index) => (
                            <TableRow key={`comp-${index}`} className="border-b border-black h-[24px] print:h-[22px] hover:bg-transparent print:hover:bg-transparent dark:hover:bg-inherit text-xs print:text-[9px]">
                                <TableCell className="text-center border border-black p-1 print:p-1 text-black">{index + 1}</TableCell>
                                <TableCell className="border border-black p-1 print:p-1 text-left text-black">{subject.subjectName}</TableCell>
                                <TableCell className="text-right border border-black p-1 print:p-1 text-black">{subject.totalMarks}</TableCell>
                                <TableCell className="text-right border border-black p-1 print:p-1 text-black">{subject.passMarks}</TableCell>
                                <TableCell className="text-right border border-black p-1 print:p-1 text-black">{subject.theoryMarksObtained}</TableCell>
                                <TableCell className="text-right border border-black p-1 print:p-1 text-black">{subject.practicalMarksObtained}</TableCell>
                                <TableCell className="text-right border border-black p-1 print:p-1 font-bold text-black">{subject.obtainedTotal}</TableCell>
                            </TableRow>
                        ))}

                        {electiveSubjects.length > 0 && (
                            <TableRow className="font-bold bg-transparent hover:bg-transparent print:hover:bg-transparent dark:hover:bg-inherit">
                                 <TableCell
                                    colSpan={7}
                                    className="border border-black bg-gray-50 print:bg-gray-50 py-0.5 px-1 print:py-0.25 print:px-0.5 text-left text-xs print:text-[10px] text-black"
                                >
                                    ELECTIVE SUBJECTS
                                </TableCell>
                            </TableRow>
                        )}
                        {electiveSubjects.map((subject, index) => (
                            <TableRow key={`elec-${index}`} className="border-b border-black h-[24px] print:h-[22px] hover:bg-transparent print:hover:bg-transparent dark:hover:bg-inherit text-xs print:text-[9px]">
                                <TableCell className="text-center border border-black p-1 print:p-1 text-black">{compulsorySubjects.length + index + 1}</TableCell>
                                <TableCell className="border border-black p-1 print:p-1 text-left text-black">{subject.subjectName}</TableCell>
                                <TableCell className="text-right border border-black p-1 print:p-1 text-black">{subject.totalMarks}</TableCell>
                                <TableCell className="text-right border border-black p-1 print:p-1 text-black">{subject.passMarks}</TableCell>
                                <TableCell className="text-right border border-black p-1 print:p-1 text-black">{subject.theoryMarksObtained}</TableCell>
                                <TableCell className="text-right border border-black p-1 print:p-1 text-black">{subject.practicalMarksObtained}</TableCell>
                                <TableCell className="text-right border border-black p-1 print:p-1 font-bold text-black">{subject.obtainedTotal}</TableCell>
                            </TableRow>
                        ))}

                        {additionalSubjects.length > 0 && (
                            <TableRow className="font-bold bg-transparent hover:bg-transparent print:hover:bg-transparent dark:hover:bg-inherit">
                                <TableCell
                                    colSpan={7}
                                    className="border border-black bg-gray-50 print:bg-gray-50 py-0.5 px-1 print:py-0.25 print:px-0.5 text-left text-xs print:text-[10px] text-black"
                                >
                                    ADDITIONAL SUBJECTS
                                </TableCell>
                            </TableRow>
                        )}
                        {additionalSubjects.map((subject, index) => (
                            <TableRow key={`add-${index}`} className="border-b border-black h-[24px] print:h-[22px] hover:bg-transparent print:hover:bg-transparent dark:hover:bg-inherit text-xs print:text-[9px]">
                                <TableCell className="text-center border border-black p-1 print:p-1 text-black">{compulsorySubjects.length + electiveSubjects.length + index + 1}</TableCell>
                                <TableCell className="border border-black p-1 print:p-1 text-left text-black">{subject.subjectName} (Addl.)</TableCell>
                                <TableCell className="text-right border border-black p-1 print:p-1 text-black">{subject.totalMarks}</TableCell>
                                <TableCell className="text-right border border-black p-1 print:p-1 text-black">{subject.passMarks}</TableCell>
                                <TableCell className="text-right border border-black p-1 print:p-1 text-black">{subject.theoryMarksObtained}</TableCell>
                                <TableCell className="text-right border border-black p-1 print:p-1 text-black">{subject.practicalMarksObtained}</TableCell>
                                <TableCell className="text-right border border-black p-1 print:p-1 font-bold text-black">{subject.obtainedTotal}</TableCell>
                            </TableRow>
                        ))}

                        <TableRow className="border-t-2 border-black h-[26px] print:h-[24px] hover:bg-transparent print:hover:bg-transparent dark:hover:bg-inherit">
                            <TableCell colSpan={6} className="text-right border-l border-r border-b border-black p-1 print:p-1 pr-2 print:pr-1.5 font-bold text-sm print:text-xs text-black">AGGREGATE (Compulsory + Elective)</TableCell>
                            <TableCell className="text-right border border-black p-1 print:p-1 font-bold text-sm print:text-xs text-black">{data.aggregateMarksCompulsoryElective}</TableCell>
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
          
          <div className="mt-auto pt-10 print:pt-[1cm] text-xs print:text-[10px] text-black">
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
            height: 100%; 
            margin: 0 !important;
            padding: 0 !important;
            background-color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
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
            min-height: 0 !important;
            max-width: none !important;
            box-sizing: border-box !important;
            display: flex !important;
            flex-direction: column !important;
            page-break-inside: avoid !important;
            border-width: 4px !important; 
            border-color: black !important;
            padding: 2pt !important; 
            margin: 0 !important; 
            background-color: white !important;
          }
          .marksheet-card > div:first-child { /* Inner content div */
             padding: 0.5cm !important;
             border-width: 1px !important;
             border-color: black !important;
             margin: 0 !important;
             height: 100% !important; 
             display: flex !important;
             flex-direction: column !important;
             box-sizing: border-box !important;
          }
          
          /* General print helper classes */
          .print\\:p-\\[0\\.5cm\\] { padding: 0.5cm !important; } 
          .print\\:mb-\\[0\\.6cm\\] { margin-bottom: 0.6cm !important; }
          .print\\:my-\\[0\\.5cm\\] { margin-top: 0.5cm !important; margin-bottom: 0.5cm !important; }
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
          .print\\:text-\\[8pt\\] { font-size: 8pt !important; line-height: 1.1 !important;}
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
          .print\\:pt-6 { padding-top: 24pt !important; }


          .print\\:shadow-none { box-shadow: none !important; }
          
          table, th, td {
             border: 1px solid black !important;
             border-collapse: collapse !important;
             page-break-inside: avoid !important;
          }
          thead.print\\:bg-gray-100 tr th {
            background-color: #F3F4F6 !important;
          }
          tr.font-bold.bg-transparent td,
          tr.font-bold.hover\\:bg-transparent td { /* Ensure specificity for hover removal on category rows */
             background-color: transparent !important;
          }
          td.bg-gray-50 { /* For category title cells */
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


          @page {
            size: A4 portrait;
            margin: 1.5cm 1.2cm 1.5cm 1.2cm; /* top right bottom left */
          }
        }
      `}</style>
    </div>
  );
}
