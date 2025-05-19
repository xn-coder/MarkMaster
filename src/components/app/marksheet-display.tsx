
'use client';

import type * as React from 'react';
import type { MarksheetDisplayData } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Printer, FilePlus2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';


interface MarksheetDisplayProps {
  data: MarksheetDisplayData;
  onCreateNew?: () => void; // Make optional if not always needed (e.g., on view page)
  isViewMode?: boolean; // To conditionally hide "Create New" button
}

export function MarksheetDisplay({ data, onCreateNew, isViewMode = false }: MarksheetDisplayProps) {
  const handlePrint = () => {
    window.print();
  };

  const compulsorySubjects = data.subjects.filter(s => s.category === 'Compulsory');
  const electiveSubjects = data.subjects.filter(s => s.category === 'Elective');
  const additionalSubjects = data.subjects.filter(s => s.category === 'Additional');

  const marksheetHeaderColor = "#032781"; // As per image

  return (
    <Card className="w-full max-w-[210mm] min-h-[297mm] mx-auto shadow-lg print:shadow-none border-2 border-black print:border-2 print:border-black my-4 print:my-0 print:mx-0 print:min-h-0 print:h-auto">
      <div className="p-1 print:p-0.5"> {/* Outer padding for the double border effect */}
        <div className="border border-black print:border-black p-2 print:p-1.5 h-full flex flex-col"> {/* Inner thinner border */}
          <header className="mb-2 print:mb-1.5">
            <div className="flex items-center justify-start mb-1 print:mb-0.5">
              <div className="flex-shrink-0 mr-3 print:mr-2">
                  <Image 
                      src="/college-logo.png" // Ensure this path is correct
                      alt="College Logo" 
                      width={80} 
                      height={80}
                      className="" // Removed fixed class for natural scaling with parent flex
                      data-ai-hint="college logo" 
                  />
              </div>
              <div className="flex-grow text-center"> {/* College details centered next to logo */}
                  <h1 className="text-xl font-bold print:text-lg leading-tight" style={{ color: marksheetHeaderColor }}>SARYUG COLLEGE</h1>
                  <p className="text-[10px] text-black print:text-[8px] leading-tight">Chitragupta Nagar, Mohanpur, Samastipur, Bihar - 848101</p>
                  <p className="text-[10px] text-black print:text-[8px] leading-tight">Affiliated By Bihar School Examination Board | [Estd. - 1983] | College Code: 53010</p>
              </div>
            </div>
            <div className="text-center mt-1 print:mt-0">
              <div 
                className="inline-block text-white px-4 py-0.5 rounded font-semibold text-base my-0.5 print:px-3 print:text-sm"
                style={{ backgroundColor: marksheetHeaderColor }}
              >
                  MARKSHEET
              </div>
            </div>
          </header>

          <CardHeader className="text-center p-1 pt-0 mb-1 print:p-0.5">
            <h2 className="text-base font-bold print:text-sm border-b-2 border-black print:border-black pb-0.5 leading-tight" style={{ color: marksheetHeaderColor }}>
              Student Details
            </h2>
          </CardHeader>
          
          <CardContent className="space-y-0.5 p-1 text-xs print:text-[10px] flex-grow">
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mb-2 print:mb-1 print:text-[9px]">
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

            <section>
              <div className="overflow-x-auto">
                <Table className="border border-black border-collapse print:text-[9px]">
                  <TableHeader className="print:bg-gray-100">
                    <TableRow className="border-b border-black">
                      <TableHead rowSpan={2} className="w-[30px] border border-black font-bold text-black text-xs print:text-[10px] text-center align-middle p-0.5">Sr. no.</TableHead>
                      <TableHead rowSpan={2} className="border border-black font-bold text-black text-xs print:text-[10px] text-center align-middle p-0.5">Subject</TableHead>
                      <TableHead rowSpan={2} className="text-center border border-black font-bold text-black text-xs print:text-[10px] align-middle p-0.5">Total Marks</TableHead>
                      <TableHead rowSpan={2} className="text-center border border-black font-bold text-black text-xs print:text-[10px] align-middle p-0.5">Passing Marks</TableHead>
                      <TableHead colSpan={2} className="text-center border-t border-r border-l border-black font-bold text-black text-xs print:text-[10px] align-middle p-0.5">Marks Obtained</TableHead>
                      <TableHead rowSpan={2} className="text-center border border-black font-bold text-black text-xs print:text-[10px] align-middle p-0.5">Total</TableHead>
                    </TableRow>
                    <TableRow className="border-b border-black">
                      <TableHead className="text-center border-b border-r border-l border-black font-bold text-black text-xs print:text-[10px] align-middle p-0.5">Theory</TableHead>
                      <TableHead className="text-center border-b border-r border-black font-bold text-black text-xs print:text-[10px] align-middle p-0.5">Practical</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {compulsorySubjects.length > 0 && (
                      <TableRow className="font-semibold bg-muted/20 print:bg-gray-100">
                        <TableCell colSpan={7} className="border border-black p-0.5 text-xs print:text-[10px]">COMPULSORY SUBJECTS</TableCell>
                      </TableRow>
                    )}
                    {compulsorySubjects.map((subject, index) => (
                      <TableRow key={`comp-${index}`} className="border-b border-black">
                        <TableCell className="text-center border-r border-l border-black p-0.5">{index + 1}</TableCell>
                        <TableCell className="border-r border-black p-0.5">{subject.subjectName}</TableCell>
                        <TableCell className="text-center border-r border-black p-0.5">{subject.totalMarks}</TableCell>
                        <TableCell className="text-center border-r border-black p-0.5">{subject.passMarks}</TableCell>
                        <TableCell className="text-center border-r border-black p-0.5">{subject.theoryMarksObtained}</TableCell>
                        <TableCell className="text-center border-r border-black p-0.5">{subject.practicalMarksObtained}</TableCell>
                        <TableCell className="text-center border-r border-black p-0.5 font-semibold">{subject.obtainedTotal}</TableCell>
                      </TableRow>
                    ))}
                    
                    {electiveSubjects.length > 0 && (
                      <TableRow className="font-semibold bg-muted/20 print:bg-gray-100">
                        <TableCell colSpan={7} className="border border-black p-0.5 text-xs print:text-[10px]">ELECTIVE SUBJECTS</TableCell>
                      </TableRow>
                    )}
                    {electiveSubjects.map((subject, index) => (
                      <TableRow key={`elec-${index}`} className="border-b border-black">
                        <TableCell className="text-center border-r border-l border-black p-0.5">{compulsorySubjects.length + index + 1}</TableCell>
                        <TableCell className="border-r border-black p-0.5">{subject.subjectName}</TableCell>
                        <TableCell className="text-center border-r border-black p-0.5">{subject.totalMarks}</TableCell>
                        <TableCell className="text-center border-r border-black p-0.5">{subject.passMarks}</TableCell>
                        <TableCell className="text-center border-r border-black p-0.5">{subject.theoryMarksObtained}</TableCell>
                        <TableCell className="text-center border-r border-black p-0.5">{subject.practicalMarksObtained}</TableCell>
                        <TableCell className="text-center border-r border-black p-0.5 font-semibold">{subject.obtainedTotal}</TableCell>
                      </TableRow>
                    ))}

                    {additionalSubjects.length > 0 && (
                       <TableRow className="font-semibold bg-muted/20 print:bg-gray-100">
                        <TableCell colSpan={7} className="border border-black p-0.5 text-xs print:text-[10px]">ADDITIONAL SUBJECTS</TableCell>
                      </TableRow>
                    )}
                     {additionalSubjects.map((subject, index) => (
                      <TableRow key={`add-${index}`} className="border-b border-black">
                        <TableCell className="text-center border-r border-l border-black p-0.5">{compulsorySubjects.length + electiveSubjects.length + index + 1}</TableCell>
                        <TableCell className="border-r border-black p-0.5">{subject.subjectName} (Addl.)</TableCell>
                        <TableCell className="text-center border-r border-black p-0.5">{subject.totalMarks}</TableCell>
                        <TableCell className="text-center border-r border-black p-0.5">{subject.passMarks}</TableCell>
                        <TableCell className="text-center border-r border-black p-0.5">{subject.theoryMarksObtained}</TableCell>
                        <TableCell className="text-center border-r border-black p-0.5">{subject.practicalMarksObtained}</TableCell>
                        <TableCell className="text-center border-r border-black p-0.5 font-semibold">{subject.obtainedTotal}</TableCell>
                      </TableRow>
                    ))}
                    
                    <TableRow className="border-t-2 border-black">
                      <TableCell colSpan={6} className="text-center font-bold border-r border-l border-black p-0.5">AGGREGATE (Compulsory + Elective)</TableCell>
                      <TableCell className="text-center font-bold border-r border-black p-0.5">{data.aggregateMarksCompulsoryElective}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </section>
            
            <Separator className="my-2 print:my-1" />

            <div className="flex justify-between items-start mt-2 text-xs print:gap-x-2 print:text-[9px] print:mt-1">
              <div>
                  <div><strong>Result:</strong> <span className={cn("font-semibold", data.overallResult === "Pass" ? "text-green-600" : "text-red-600")}>{data.overallResult} ({data.overallPercentageDisplay.toFixed(2)}%)</span></div>
                  <div><strong>Place:</strong> {data.place}</div>
              </div>
              <div className="text-right"><strong>Date of Issue:</strong> {data.dateOfIssue}</div>
            </div>
            
            <div className="mt-auto pt-8 print:pt-6"> {/* Pushes signatures to bottom */}
                <div className="flex justify-between text-xs print:text-[9px]">
                    <div className="text-center">
                        <hr className="border-black print:border-black mb-1 w-32" />
                        <span>Sign of Counter Clerk</span>
                    </div>
                    <div className="text-center">
                        <hr className="border-black print:border-black mb-1 w-32" />
                        <span>Sign of Principal</span>
                    </div>
                </div>
            </div>
          </CardContent>
        </div>
      </div>
      <CardFooter className="flex flex-col sm:flex-row justify-end gap-3 p-4 print:hidden">
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
      </CardFooter>
      <style jsx global>{`
        @media print {
          html, body {
            height: auto;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden; /* Helps hide scrollbars during print */
          }
          .print\\:hidden { display: none !important; }
          .print\\:border-black { border-color: black !important; }
          .print\\:border-2 { border-width: 2px !important; }
          .print\\:border { border-width: 1px !important; }
          .print\\:text-black { color: black !important; }
          .print\\:bg-gray-100 { background-color: #F3F4F6 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          
          /* More specific font size adjustments for print */
          .print\\:text-\\[10px\\] { font-size: 10px !important; line-height: 1.2 !important;}
          .print\\:text-\\[9px\\] { font-size: 9px !important; line-height: 1.2 !important;}
          .print\\:text-\\[8px\\] { font-size: 8px !important; line-height: 1.2 !important;}
          .print\\:text-xs { font-size: 0.65rem !important; line-height: 1.2 !important; } /* ~10.4px */
          .print\\:text-sm { font-size: 0.75rem !important; line-height: 1.2 !important; } /* 12px */
          .print\\:text-base { font-size: 0.875rem !important; line-height: 1.3 !important; } /* 14px */
          .print\\:text-lg { font-size: 1rem !important; line-height: 1.3 !important; } /* 16px */


          .print\\:p-0\\.5 { padding: 0.1rem !important; }
          .print\\:p-1 { padding: 0.2rem !important; }
          .print\\:p-1\\.5 { padding: 0.3rem !important; }
          .print\\:m-0 { margin: 0 !important; }
          .print\\:mb-0\\.5 { margin-bottom: 0.1rem !important; }
          .print\\:mb-1 { margin-bottom: 0.2rem !important; }
          .print\\:mb-1\\.5 { margin-bottom: 0.3rem !important; }
          .print\\:mt-0 { margin-top: 0 !important; }
          .print\\:mt-1 { margin-top: 0.2rem !important; }
          .print\\:pt-6 { padding-top: 1.5rem !important; }


          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:justify-start { justify-content: flex-start !important; }
          .print\\:mr-2 { margin-right: 0.5rem !important; }
          
          .max-w-\\[210mm\\] { /* A4 width */
            max-width: 100% !important;
            width: 100% !important;
            box-sizing: border-box;
          }
          .min-h-\\[297mm\\] { /* A4 height */
             min-height: 0 !important; /* Allow content to define height for print */
             height: auto !important;
          }
          
          table, th, td {
             border: 1px solid black !important; /* Ensure borders for all table elements */
             -webkit-print-color-adjust: exact; 
             print-color-adjust: exact;
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
            size: A4 portrait; /* Ensure A4 portrait */
            margin: 1cm; /* Adjust margin as needed, or remove if card fills page */
          }
        }
      `}</style>
    </Card>
  );
}

