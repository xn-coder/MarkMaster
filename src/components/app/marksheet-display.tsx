
'use client';

import type * as React from 'react';
import type { MarksheetDisplayData } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card'; // Removed CardHeader, CardFooter as we manage structure directly
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Printer, FilePlus2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
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

  const collegeNameColor = "#032781"; // As per image
  const marksheetBannerBgColor = "#DB2A2A"; // Approximated from image

  return (
    <div className="print:p-0 print:m-0">
      <Card className="w-full max-w-[210mm] min-h-[297mm] mx-auto shadow-lg print:shadow-none border-2 border-black print:border-2 print:border-black my-4 print:my-0 print:mx-0 print:min-h-0 flex flex-col">
        <div className="p-1 print:p-0.5 flex-grow flex flex-col"> {/* Outer padding for the double border effect */}
          <div className="border border-black print:border-black p-4 print:p-3 h-full flex flex-col relative"> {/* Inner thinner border with more padding */}
            
            {/* Website URL Top Right */}
            <div className="absolute top-2.5 right-3.5 text-[10px] print:text-[8px] text-gray-700 print:text-black">
              www.saryugcollege.com
            </div>

            {/* Header Section */}
            <header className="mb-3 print:mb-2">
              <div className="flex items-center justify-start mb-2 print:mb-1.5">
                <div className="flex-shrink-0 mr-4 print:mr-3">
                    <Image 
                        src="/college-logo.png"
                        alt="College Logo" 
                        width={80} 
                        height={80}
                        className=""
                        data-ai-hint="college logo" 
                    />
                </div>
                <div className="flex flex-col text-center flex-grow"> {/* Centered college details */}
                    <h1 className="text-2xl font-bold print:text-xl leading-tight" style={{ color: collegeNameColor }}>SARYUG COLLEGE</h1>
                    <p className="text-sm font-semibold text-black print:text-xs leading-tight mt-0.5">Chitragupta Nagar, Mohanpur, Samastipur, Bihar - 848101</p>
                    <p className="text-[11px] text-black print:text-[9px] leading-tight mt-0.5">Affiliated By Bihar School Examination Board | [Estd. - 1983]</p>
                    <p className="text-[11px] text-black print:text-[9px] leading-tight">College Code: 53010</p>
                </div>
              </div>
              <div className="text-center mt-2 print:mt-1">
                <div 
                  className="inline-block text-white px-6 py-1 rounded font-semibold text-lg print:px-4 print:py-0.5 print:text-base"
                  style={{ backgroundColor: marksheetBannerBgColor }}
                >
                    MARKSHEET
                </div>
              </div>
            </header>

            <div className="text-center p-1 pt-0 mb-2 print:p-0.5">
              <h2 className="text-lg font-bold print:text-base border-b-2 border-black print:border-black pb-1 leading-tight" style={{ color: collegeNameColor }}>
                Student Details
              </h2>
            </div>
            
            {/* Main Content Area */}
            <div className="flex-grow flex flex-col space-y-1 text-sm print:text-[10px]">
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 mb-3 print:mb-2">
                <div><strong>Student Name:</strong> {data.studentName}</div>
                <div><strong>Marksheet No:</strong> {data.marksheetNo}</div>
                <div><strong>Father Name:</strong> {data.fatherName}</div>
                <div><strong>Mother Name:</strong> {data.motherName}</div>
                <div><strong>Session:</strong> {data.sessionDisplay}</div>
                <div><strong>Roll No:</strong> {data.rollNumber}</div>
                <div><strong>Date of Birth:</strong> {format(new Date(data.dateOfBirth), "dd-MM-yyyy")}</div>
                <div><strong>Gender:</strong> {data.gender}</div>
                <div><strong>Faculty:</strong> {data.faculty}</div>
                <div><strong>Class:</strong> {data.classDisplay}</div>
              </div>

              <section className="flex-grow"> {/* Allow table section to grow */}
                <div className="overflow-x-auto">
                  <Table className="border border-black border-collapse print:text-[9px]">
                    <TableHeader className="print:bg-gray-100">
                      <TableRow className="border-b border-black">
                        <TableHead rowSpan={2} className="w-[35px] border border-black font-bold text-black text-[10px] print:text-[8px] text-center align-middle p-0.5 print:p-0.25">Sr. no.</TableHead>
                        <TableHead rowSpan={2} className="min-w-[200px] border border-black font-bold text-black text-[10px] print:text-[8px] text-left align-middle p-1 print:p-0.5">Subject</TableHead>
                        <TableHead rowSpan={2} className="w-[70px] text-center border border-black font-bold text-black text-[10px] print:text-[8px] align-middle p-0.5 print:p-0.25">Total Marks</TableHead>
                        <TableHead rowSpan={2} className="w-[70px] text-center border border-black font-bold text-black text-[10px] print:text-[8px] align-middle p-0.5 print:p-0.25">Passing Marks</TableHead>
                        <TableHead colSpan={2} className="w-[140px] text-center border-t border-r border-l border-black font-bold text-black text-[10px] print:text-[8px] align-middle p-0.5 print:p-0.25">Marks Obtained</TableHead>
                        <TableHead rowSpan={2} className="w-[70px] text-center border border-black font-bold text-black text-[10px] print:text-[8px] align-middle p-0.5 print:p-0.25">Total</TableHead>
                      </TableRow>
                      <TableRow className="border-b border-black">
                        <TableHead className="w-[70px] text-center border-b border-r border-l border-black font-bold text-black text-[10px] print:text-[8px] align-middle p-0.5 print:p-0.25">Theory</TableHead>
                        <TableHead className="w-[70px] text-center border-b border-r border-black font-bold text-black text-[10px] print:text-[8px] align-middle p-0.5 print:p-0.25">Practical</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {compulsorySubjects.length > 0 && (
                        <TableRow className="font-semibold bg-muted/20 print:bg-gray-100">
                          <TableCell colSpan={7} className="border border-black p-1 text-xs print:text-[10px]">COMPULSORY SUBJECTS</TableCell>
                        </TableRow>
                      )}
                      {compulsorySubjects.map((subject, index) => (
                        <TableRow key={`comp-${index}`} className="border-b border-black">
                          <TableCell className="text-center border-r border-l border-black p-0.5">{index + 1}</TableCell>
                          <TableCell className="border-r border-black p-1">{subject.subjectName}</TableCell>
                          <TableCell className="text-center border-r border-black p-0.5">{subject.totalMarks}</TableCell>
                          <TableCell className="text-center border-r border-black p-0.5">{subject.passMarks}</TableCell>
                          <TableCell className="text-center border-r border-black p-0.5">{subject.theoryMarksObtained}</TableCell>
                          <TableCell className="text-center border-r border-black p-0.5">{subject.practicalMarksObtained}</TableCell>
                          <TableCell className="text-center border-r border-black p-0.5 font-semibold">{subject.obtainedTotal}</TableCell>
                        </TableRow>
                      ))}
                      
                      {electiveSubjects.length > 0 && (
                        <TableRow className="font-semibold bg-muted/20 print:bg-gray-100">
                          <TableCell colSpan={7} className="border border-black p-1 text-xs print:text-[10px]">ELECTIVE SUBJECTS</TableCell>
                        </TableRow>
                      )}
                      {electiveSubjects.map((subject, index) => (
                        <TableRow key={`elec-${index}`} className="border-b border-black">
                          <TableCell className="text-center border-r border-l border-black p-0.5">{compulsorySubjects.length + index + 1}</TableCell>
                          <TableCell className="border-r border-black p-1">{subject.subjectName}</TableCell>
                          <TableCell className="text-center border-r border-black p-0.5">{subject.totalMarks}</TableCell>
                          <TableCell className="text-center border-r border-black p-0.5">{subject.passMarks}</TableCell>
                          <TableCell className="text-center border-r border-black p-0.5">{subject.theoryMarksObtained}</TableCell>
                          <TableCell className="text-center border-r border-black p-0.5">{subject.practicalMarksObtained}</TableCell>
                          <TableCell className="text-center border-r border-black p-0.5 font-semibold">{subject.obtainedTotal}</TableCell>
                        </TableRow>
                      ))}

                      {additionalSubjects.length > 0 && (
                         <TableRow className="font-semibold bg-muted/20 print:bg-gray-100">
                          <TableCell colSpan={7} className="border border-black p-1 text-xs print:text-[10px]">ADDITIONAL SUBJECTS</TableCell>
                        </TableRow>
                      )}
                       {additionalSubjects.map((subject, index) => (
                        <TableRow key={`add-${index}`} className="border-b border-black">
                          <TableCell className="text-center border-r border-l border-black p-0.5">{compulsorySubjects.length + electiveSubjects.length + index + 1}</TableCell>
                          <TableCell className="border-r border-black p-1">{subject.subjectName} (Addl.)</TableCell>
                          <TableCell className="text-center border-r border-black p-0.5">{subject.totalMarks}</TableCell>
                          <TableCell className="text-center border-r border-black p-0.5">{subject.passMarks}</TableCell>
                          <TableCell className="text-center border-r border-black p-0.5">{subject.theoryMarksObtained}</TableCell>
                          <TableCell className="text-center border-r border-black p-0.5">{subject.practicalMarksObtained}</TableCell>
                          <TableCell className="text-center border-r border-black p-0.5 font-semibold">{subject.obtainedTotal}</TableCell>
                        </TableRow>
                      ))}
                      
                      <TableRow className="border-t-2 border-black">
                        <TableCell colSpan={6} className="text-right font-bold border-r border-l border-black p-1 pr-4">AGGREGATE (Compulsory + Elective)</TableCell>
                        <TableCell className="text-center font-bold border-r border-black p-0.5">{data.aggregateMarksCompulsoryElective}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </section>
              
              <Separator className="my-3 print:my-2" />

              <div className="grid grid-cols-2 items-start mt-2 print:mt-1.5">
                <div>
                    <div><strong>Result:</strong> <span className={cn("font-semibold", data.overallResult === "Pass" ? "text-green-700" : "text-red-700")}>{data.overallResult} ({data.overallPercentageDisplay.toFixed(2)}%)</span></div>
                    <div><strong>Place:</strong> {data.place}</div>
                </div>
                <div className="text-right"><strong>Date of Issue:</strong> {data.dateOfIssue}</div>
              </div>
            </div> {/* End flex-grow content area */}
            
            {/* Signature Section - Pushed to bottom */}
            <div className="mt-auto pt-10 print:pt-8"> {/* Increased padding-top for more space */}
                <div className="flex justify-between text-sm print:text-[10px]">
                    <div className="text-center">
                        <hr className="border-black print:border-black mb-1 w-40 mx-auto" />
                        <span>Sign of Counter Clerk</span>
                    </div>
                    <div className="text-center">
                        <hr className="border-black print:border-black mb-1 w-40 mx-auto" />
                        <span>Sign of Principal</span>
                    </div>
                </div>
            </div>
          </div> {/* End inner border div */}
        </div> {/* End outer padding div */}
      </Card> {/* End Main Card */}

      {/* Action Buttons - Hidden on Print */}
      <div className="flex flex-col sm:flex-row justify-end gap-3 p-4 print:hidden mt-4">
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
          html, body {
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            font-size: 10pt !important; /* Base font size for print */
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print\\:hidden { display: none !important; }
          .print\\:p-0 { padding: 0 !important; }
          .print\\:m-0 { margin: 0 !important; }
          .print\\:border-black { border-color: black !important; }
          .print\\:border-2 { border-width: 2px !important; }
          .print\\:border { border-width: 1px !important; }
          .print\\:text-black { color: black !important; }
          .print\\:bg-gray-100 { background-color: #F3F4F6 !important; }
          
          .print\\:text-\\[10px\\] { font-size: 10px !important; line-height: 1.2 !important;}
          .print\\:text-\\[9px\\] { font-size: 9px !important; line-height: 1.2 !important;}
          .print\\:text-\\[8px\\] { font-size: 8px !important; line-height: 1.2 !important;}
          .print\\:text-xs { font-size: 0.70rem !important; line-height: 1.2 !important; } /* ~9.5px -> adjusted for print */
          .print\\:text-sm { font-size: 0.75rem !important; line-height: 1.2 !important; } /* 10px -> adjusted for print */
          .print\\:text-base { font-size: 0.875rem !important; line-height: 1.3 !important; } /* 11px -> adjusted for print */
          .print\\:text-lg { font-size: 1rem !important; line-height: 1.3 !important; } /* 12pt -> adjusted for print */
          .print\\:text-xl { font-size: 1.125rem !important; line-height: 1.3 !important; } /* 14pt -> adjusted for print */

          .print\\:p-0\\.25 { padding: 0.0625rem !important; } /* For very tight table header padding */
          .print\\:p-0\\.5 { padding: 0.1rem !important; }
          .print\\:p-1 { padding: 0.2rem !important; }
          .print\\:p-1\\.5 { padding: 0.25rem !important; }
          .print\\:p-2 { padding: 0.3rem !important; }
          .print\\:p-2\\.5 { padding: 0.4rem !important; }
          .print\\:p-3 { padding: 0.5rem !important; } /* Increased padding for content */


          .print\\:mb-0\\.5 { margin-bottom: 0.1rem !important; }
          .print\\:mb-1 { margin-bottom: 0.2rem !important; }
          .print\\:mb-1\\.5 { margin-bottom: 0.25rem !important; }
          .print\\:mb-2 { margin-bottom: 0.3rem !important; }
          .print\\:mt-0 { margin-top: 0 !important; }
          .print\\:mt-1 { margin-top: 0.2rem !important; }
          .print\\:pt-8 { padding-top: 2rem !important; }


          .print\\:shadow-none { box-shadow: none !important; }
          
          .max-w-\\[210mm\\].min-h-\\[297mm\\] { /* Target the main card for print sizing */
            width: 100% !important; /* Fill within @page margins */
            height: auto !important; /* Allow content to define height */
            min-height: 0 !important; /* Reset min-height for print */
            max-width: none !important; /* Reset max-width for print */
            box-sizing: border-box !important;
          }
          
          table, th, td {
             border: 1px solid black !important;
             border-collapse: collapse !important; /* Ensure borders don't double up */
          }
          thead.print\\:bg-gray-100 tr th { 
            background-color: #F3F4F6 !important;
          }
           tr.font-semibold.bg-muted\\/20.print\\:bg-gray-100 td { 
             background-color: #F3F4F6 !important;
           }
          hr.print\\:border-black {
            border-color: black !important;
            border-top-width: 1px !important;
          }

          @page {
            size: A4 portrait;
            margin: 10mm; /* Standard margin for printing */
          }
        }
      `}</style>
    </div>
  );
}
