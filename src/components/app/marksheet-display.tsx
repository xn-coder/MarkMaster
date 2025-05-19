
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
  onCreateNew: () => void;
}

export function MarksheetDisplay({ data, onCreateNew }: MarksheetDisplayProps) {
  const handlePrint = () => {
    window.print();
  };

  const compulsorySubjects = data.subjects.filter(s => s.category === 'Compulsory');
  const electiveSubjects = data.subjects.filter(s => s.category === 'Elective');
  const additionalSubjects = data.subjects.filter(s => s.category === 'Additional');

  const marksheetHeaderColor = "#032781";

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-lg print:shadow-none border-2 border-black print:border-2 print:border-black my-4">
      <div className="p-4 print:p-2"> {/* Outer padding for the double border effect */}
        <div className="border border-gray-400 print:border-gray-500 p-3 print:p-2"> {/* Inner thinner border */}
          <header className="mb-3 print:mb-2">
            <div className="flex items-center justify-between print:justify-start mb-2">
              <div className="flex-shrink-0">
                  <Image 
                      src="/college-logo.png"
                      alt="College Logo" 
                      width={70} // Increased logo size
                      height={70} // Increased logo size
                      className="mr-3 print:mr-2"
                      data-ai-hint="college logo" 
                  />
              </div>
              <div className="flex-grow text-center print:text-left print:ml-3">
                  <h1 className="text-2xl font-bold print:text-xl" style={{ color: marksheetHeaderColor }}>SARYUG COLLEGE</h1>
                  <p className="text-sm text-muted-foreground print:text-black print:text-xs">Chitragupta Nagar, Mohanpur, Samastipur, Bihar - 848101</p>
                  <p className="text-xs text-muted-foreground print:text-black print:text-[10px]">Affiliated By Bihar School Examination Board | [Estd. - 1983] | College Code: 53010</p>
              </div>
              <div className="w-[70px] flex-shrink-0 print:hidden"></div> {/* Spacer for screen view */}
            </div>
            <div className="text-center mt-1 print:mt-0.5">
              <div 
                className="inline-block text-white px-6 py-1 rounded font-semibold text-lg my-1 print:px-4 print:py-0.5 print:text-base"
                style={{ backgroundColor: marksheetHeaderColor }}
              >
                  MARKSHEET
              </div>
            </div>
          </header>

          <CardHeader className="text-center p-2 pt-0 mb-2 print:p-1">
            <h2 className="text-lg font-semibold print:text-base border-b-2 border-black print:border-black pb-1" style={{ color: marksheetHeaderColor }}>
              Student Details
            </h2>
          </CardHeader>
          
          <CardContent className="space-y-1 p-2 text-sm print:p-1 print:text-xs">
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 mb-3 print:gap-x-4 print:text-[11px]">
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
                <Table className="border border-black border-collapse print:text-xs">
                  <TableHeader className="print:bg-gray-100">
                    <TableRow className="border-b border-black">
                      <TableHead rowSpan={2} className="w-[50px] border border-black font-semibold print:w-[40px] text-center align-middle">Sr. no.</TableHead>
                      <TableHead rowSpan={2} className="border border-black font-semibold align-middle">Subject</TableHead>
                      <TableHead rowSpan={2} className="text-center border border-black font-semibold align-middle">Total Marks</TableHead>
                      <TableHead rowSpan={2} className="text-center border border-black font-semibold align-middle">Passing Marks</TableHead>
                      <TableHead colSpan={2} className="text-center border-t border-r border-l border-black font-semibold align-middle">Marks Obtained</TableHead>
                      <TableHead rowSpan={2} className="text-center border border-black font-semibold align-middle">Total</TableHead>
                    </TableRow>
                    <TableRow className="border-b border-black">
                      <TableHead className="text-center border-b border-r border-l border-black font-semibold align-middle">Theory</TableHead>
                      <TableHead className="text-center border-b border-r border-black font-semibold align-middle">Practical</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {compulsorySubjects.length > 0 && (
                      <TableRow className="font-semibold bg-muted/30 print:bg-gray-100">
                        <TableCell colSpan={7} className="border border-black p-1">COMPULSORY SUBJECTS</TableCell>
                      </TableRow>
                    )}
                    {compulsorySubjects.map((subject, index) => (
                      <TableRow key={`comp-${index}`} className="border-b border-black">
                        <TableCell className="text-center border-r border-l border-black p-1">{index + 1}</TableCell>
                        <TableCell className="border-r border-black p-1">{subject.subjectName}</TableCell>
                        <TableCell className="text-center border-r border-black p-1">{subject.totalMarks}</TableCell>
                        <TableCell className="text-center border-r border-black p-1">{subject.passMarks}</TableCell>
                        <TableCell className="text-center border-r border-black p-1">{subject.theoryMarksObtained}</TableCell>
                        <TableCell className="text-center border-r border-black p-1">{subject.practicalMarksObtained}</TableCell>
                        <TableCell className="text-center border-r border-black p-1 font-semibold">{subject.obtainedTotal}</TableCell>
                      </TableRow>
                    ))}
                    
                    {electiveSubjects.length > 0 && (
                      <TableRow className="font-semibold bg-muted/30 print:bg-gray-100">
                        <TableCell colSpan={7} className="border border-black p-1">ELECTIVE SUBJECTS</TableCell>
                      </TableRow>
                    )}
                    {electiveSubjects.map((subject, index) => (
                      <TableRow key={`elec-${index}`} className="border-b border-black">
                        <TableCell className="text-center border-r border-l border-black p-1">{compulsorySubjects.length + index + 1}</TableCell>
                        <TableCell className="border-r border-black p-1">{subject.subjectName}</TableCell>
                        <TableCell className="text-center border-r border-black p-1">{subject.totalMarks}</TableCell>
                        <TableCell className="text-center border-r border-black p-1">{subject.passMarks}</TableCell>
                        <TableCell className="text-center border-r border-black p-1">{subject.theoryMarksObtained}</TableCell>
                        <TableCell className="text-center border-r border-black p-1">{subject.practicalMarksObtained}</TableCell>
                        <TableCell className="text-center border-r border-black p-1 font-semibold">{subject.obtainedTotal}</TableCell>
                      </TableRow>
                    ))}

                    {additionalSubjects.length > 0 && (
                       <TableRow className="font-semibold bg-muted/30 print:bg-gray-100">
                        <TableCell colSpan={7} className="border border-black p-1">ADDITIONAL SUBJECTS</TableCell>
                      </TableRow>
                    )}
                     {additionalSubjects.map((subject, index) => (
                      <TableRow key={`add-${index}`} className="border-b border-black">
                        <TableCell className="text-center border-r border-l border-black p-1">{compulsorySubjects.length + electiveSubjects.length + index + 1}</TableCell>
                        <TableCell className="border-r border-black p-1">{subject.subjectName} (Addl.)</TableCell>
                        <TableCell className="text-center border-r border-black p-1">{subject.totalMarks}</TableCell>
                        <TableCell className="text-center border-r border-black p-1">{subject.passMarks}</TableCell>
                        <TableCell className="text-center border-r border-black p-1">{subject.theoryMarksObtained}</TableCell>
                        <TableCell className="text-center border-r border-black p-1">{subject.practicalMarksObtained}</TableCell>
                        <TableCell className="text-center border-r border-black p-1 font-semibold">{subject.obtainedTotal}</TableCell>
                      </TableRow>
                    ))}
                    
                    <TableRow className="border-t-2 border-black">
                      <TableCell colSpan={6} className="text-right font-bold border-r border-l border-black p-1 pr-2">AGGREGATE (Compulsory + Elective)</TableCell>
                      <TableCell className="text-center font-bold border-r border-black p-1">{data.aggregateMarksCompulsoryElective}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </section>
            
            <Separator className="my-3 print:my-1.5" />

            <div className="flex justify-between items-start mt-3 text-sm print:gap-x-4 print:text-[11px] print:mt-1.5">
              <div>
                  <div><strong>Result:</strong> <span className={cn("font-semibold", data.overallResult === "Pass" ? "text-green-600" : "text-red-600")}>{data.overallResult} ({data.overallPercentageDisplay.toFixed(2)}%)</span></div>
                  <div><strong>Place:</strong> {data.place}</div>
              </div>
              <div className="text-right"><strong>Date of Issue:</strong> {data.dateOfIssue}</div>
            </div>

            <div className="mt-12 pt-6 flex justify-between text-sm print:mt-10 print:pt-4 print:text-xs">
              <span>Sign of Counter Clerk</span>
              <span>Sign of Principal</span>
            </div>
          </CardContent>
        </div>
      </div>
      <CardFooter className="flex flex-col sm:flex-row justify-end gap-3 p-4 print:hidden">
        <Button variant="outline" onClick={onCreateNew}>
          <FilePlus2 className="mr-2 h-4 w-4" /> Create New
        </Button>
        <Button variant="outline" onClick={() => alert('PDF Download to be implemented.')}>
          <Download className="mr-2 h-4 w-4" /> Download PDF
        </Button>
        <Button onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" /> Print Marksheet
        </Button>
      </CardFooter>
      <style jsx global>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            font-size: 10pt; /* Base font size for print */
          }
          .print\\:hidden { display: none !important; }
          .print\\:border-black { border-color: black !important; }
          .print\\:border-2 { border-width: 2px !important; }
          .print\\:border { border-width: 1px !important; }
          .print\\:text-black { color: black !important; }
          .print\\:bg-gray-200 { background-color: #E5E7EB !important; }
          .print\\:bg-gray-100 { background-color: #F3F4F6 !important; }
          
          .print\\:text-\\[11px\\] { font-size: 11px !important; line-height: 1.1 !important;}
          .print\\:text-\\[10px\\] { font-size: 10px !important; line-height: 1.1 !important;}
          .print\\:text-xs { font-size: 0.7rem !important; line-height: 1.1 !important; }
          .print\\:text-sm { font-size: 0.75rem !important; line-height: 1.1 !important; }
          .print\\:text-base { font-size: 0.8rem !important; line-height: 1.1 !important; }
          .print\\:text-lg { font-size: 0.9rem !important; line-height: 1.2 !important; }
          .print\\:text-xl { font-size: 1rem !important; line-height: 1.3 !important; }

          .print\\:p-0\\.5 { padding: 0.125rem !important; }
          .print\\:p-1 { padding: 0.25rem !important; }
          .print\\:p-2 { padding: 0.5rem !important; }
          .print\\:m-0 { margin: 0 !important; }
          .print\\:mb-1 { margin-bottom: 0.25rem !important; }
          .print\\:mb-2 { margin-bottom: 0.5rem !important; }
          .print\\:mt-0\\.5 { margin-top: 0.125rem !important; }
          .print\\:mt-1\\.5 { margin-top: 0.375rem !important; }
          .print\\:mt-2 { margin-top: 0.5rem !important; }
          .print\\:mt-10 { margin-top: 2.5rem !important; }
          .print\\:pt-4 { padding-top: 1rem !important; }

          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:justify-start { justify-content: flex-start !important; }
          .print\\:ml-3 { margin-left: 0.75rem !important; }
          .print\\:w-\\[40px\\] { width: 40px !important; }
          

          .max-w-4xl { 
            max-width: 100% !important;
            width: 100% !important;
          }
          /* Ensure table borders are consistently black for print */
          .print\\:border-black, table.print\\:border-black th, table.print\\:border-black td {
            border-color: black !important;
          }
          table, th, td {
             border: 1px solid black !important; /* Ensure borders for all table elements */
          }
          thead.print\\:bg-gray-100 tr th { /* Ensure header background is applied */
            background-color: #F3F4F6 !important;
          }
           tr.font-semibold.bg-muted\\/30.print\\:bg-gray-100 td { /* Category row background */
             background-color: #F3F4F6 !important;
           }


          @page {
            size: A4;
            margin: 0.5in; 
          }
        }
      `}</style>
    </Card>
  );
}
