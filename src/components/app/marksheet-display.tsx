
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


  return (
    <Card className="w-full max-w-4xl mx-auto shadow-lg print:shadow-none border-2 border-primary print:border-black">
      <div className="p-4 print:p-2">
        <header className="mb-4">
          <div className="flex items-center justify-between print:justify-start"> {/* Changed to justify-between for screen, justify-start for print to keep logo left */}
            <div className="flex-shrink-0">
                <Image 
                    src="/college-logo.png"
                    alt="College Logo" 
                    width={60} 
                    height={60} 
                    className="mr-3 print:mr-2"
                    data-ai-hint="college logo" 
                />
            </div>
            <div className="flex-grow text-center print:text-left print:ml-4">
                <h1 className="text-2xl font-bold text-primary print:text-black print:text-xl">SARYUG COLLEGE</h1>
                <p className="text-sm text-muted-foreground print:text-black print:text-xs">Chitragupta Nagar, Mohanpur, Samastipur, Bihar - 848101</p>
                <p className="text-xs text-muted-foreground print:text-black print:text-[10px]">Affiliated By Bihar School Examination Board | [Estd. - 1983] | College Code: 53010</p>
            </div>
             {/* Optional: Spacer for screen view if logo is not wide enough to balance the right side for centering college details */}
             <div className="w-[60px] flex-shrink-0 print:hidden"></div>
          </div>
          <div className="text-center mt-2">
            <div className="inline-block bg-destructive text-destructive-foreground px-6 py-1 rounded font-semibold text-lg my-2 print:bg-gray-700 print:text-white print:px-4 print:py-0.5 print:text-base">
                MARKSHEET
            </div>
          </div>
        </header>

        <CardHeader className="text-left p-2 pt-0 mb-2 print:p-1">
          <h2 className="text-xl font-semibold text-primary print:text-black print:text-lg border-b-2 border-primary print:border-black pb-1">Student Details</h2>
        </CardHeader>
        
        <CardContent className="space-y-1 p-2 text-sm print:p-1 print:text-xs">
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 mb-4 print:gap-x-4">
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
              <Table className="border border-collapse print:text-xs">
                <TableHeader className="bg-muted/50 print:bg-gray-200">
                  <TableRow>
                    <TableHead className="w-[50px] border font-semibold print:border-black text-center print:w-[40px]">Sr. no.</TableHead>
                    <TableHead className="border font-semibold print:border-black">Subject</TableHead>
                    <TableHead className="text-center border font-semibold print:border-black">Total Marks</TableHead>
                    <TableHead className="text-center border font-semibold print:border-black">Passing Marks</TableHead>
                    <TableHead className="text-center border font-semibold print:border-black">Theory</TableHead>
                    <TableHead className="text-center border font-semibold print:border-black">Practical</TableHead>
                    <TableHead className="text-center border font-semibold print:border-black">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {compulsorySubjects.length > 0 && (
                    <TableRow className="font-semibold bg-muted/30 print:bg-gray-100">
                      <TableCell colSpan={7} className="border p-1 print:border-black">COMPULSORY SUBJECTS</TableCell>
                    </TableRow>
                  )}
                  {compulsorySubjects.map((subject, index) => (
                    <TableRow key={`comp-${index}`}>
                      <TableCell className="text-center border p-1 print:border-black">{index + 1}</TableCell>
                      <TableCell className="border p-1 print:border-black">{subject.subjectName}</TableCell>
                      <TableCell className="text-center border p-1 print:border-black">{subject.totalMarks}</TableCell>
                      <TableCell className="text-center border p-1 print:border-black">{subject.passMarks}</TableCell>
                      <TableCell className="text-center border p-1 print:border-black">{subject.theoryMarksObtained}</TableCell>
                      <TableCell className="text-center border p-1 print:border-black">{subject.practicalMarksObtained}</TableCell>
                      <TableCell className="text-center border p-1 print:border-black">{subject.obtainedTotal}</TableCell>
                    </TableRow>
                  ))}
                  
                  {electiveSubjects.length > 0 && (
                    <TableRow className="font-semibold bg-muted/30 print:bg-gray-100">
                      <TableCell colSpan={7} className="border p-1 print:border-black">ELECTIVE SUBJECTS</TableCell>
                    </TableRow>
                  )}
                  {electiveSubjects.map((subject, index) => (
                    <TableRow key={`elec-${index}`}>
                      <TableCell className="text-center border p-1 print:border-black">{compulsorySubjects.length + index + 1}</TableCell>
                      <TableCell className="border p-1 print:border-black">{subject.subjectName}</TableCell>
                      <TableCell className="text-center border p-1 print:border-black">{subject.totalMarks}</TableCell>
                      <TableCell className="text-center border p-1 print:border-black">{subject.passMarks}</TableCell>
                      <TableCell className="text-center border p-1 print:border-black">{subject.theoryMarksObtained}</TableCell>
                      <TableCell className="text-center border p-1 print:border-black">{subject.practicalMarksObtained}</TableCell>
                      <TableCell className="text-center border p-1 print:border-black">{subject.obtainedTotal}</TableCell>
                    </TableRow>
                  ))}

                  {additionalSubjects.length > 0 && (
                     <TableRow className="font-semibold bg-muted/30 print:bg-gray-100">
                      <TableCell colSpan={7} className="border p-1 print:border-black">ADDITIONAL SUBJECTS</TableCell>
                    </TableRow>
                  )}
                   {additionalSubjects.map((subject, index) => (
                    <TableRow key={`add-${index}`}>
                      <TableCell className="text-center border p-1 print:border-black">{compulsorySubjects.length + electiveSubjects.length + index + 1}</TableCell>
                      <TableCell className="border p-1 print:border-black">{subject.subjectName} (Addl.)</TableCell>
                      <TableCell className="text-center border p-1 print:border-black">{subject.totalMarks}</TableCell>
                      <TableCell className="text-center border p-1 print:border-black">{subject.passMarks}</TableCell>
                      <TableCell className="text-center border p-1 print:border-black">{subject.theoryMarksObtained}</TableCell>
                      <TableCell className="text-center border p-1 print:border-black">{subject.practicalMarksObtained}</TableCell>
                      <TableCell className="text-center border p-1 print:border-black">{subject.obtainedTotal}</TableCell>
                    </TableRow>
                  ))}
                  
                  <TableRow>
                    <TableCell colSpan={6} className="text-right font-bold border p-1 print:border-black">AGGREGATE (Compulsory + Elective)</TableCell>
                    <TableCell className="text-center font-bold border p-1 print:border-black">{data.aggregateMarksCompulsoryElective}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </section>
          
          <Separator className="my-4 print:my-2" />

          <div className="grid grid-cols-2 gap-x-8 gap-y-1 mt-4 text-sm print:gap-x-4">
            <div><strong>Result:</strong> <span className={cn("font-semibold", data.overallResult === "Pass" ? "text-green-600" : "text-red-600")}>{data.overallResult} ({data.overallPercentageDisplay.toFixed(2)}%)</span></div>
            <div><strong>Date of Issue:</strong> {data.dateOfIssue}</div>
            <div><strong>Place:</strong> {data.place}</div>
          </div>

          <div className="mt-16 pt-8 flex justify-between text-sm print:mt-12 print:pt-6 print:text-xs">
            <span>Sign of Counter Clerk</span>
            <span>Sign of Principal</span>
          </div>

        </CardContent>
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
          .print\\:text-black { color: black !important; }
          .print\\:bg-gray-200 { background-color: #E5E7EB !important; }
          .print\\:bg-gray-100 { background-color: #F3F4F6 !important; }
          .print\\:text-xs { font-size: 0.7rem !important; line-height: 0.9rem !important; }
          .print\\:text-sm { font-size: 0.75rem !important; line-height: 1rem !important; }
          .print\\:text-base { font-size: 0.8rem !important; line-height: 1.1rem !important; }
          .print\\:text-lg { font-size: 0.9rem !important; line-height: 1.2rem !important; }
          .print\\:text-xl { font-size: 1rem !important; line-height: 1.3rem !important; }

          .print\\:p-0\\.5 { padding: 0.125rem !important; }
          .print\\:p-1 { padding: 0.25rem !important; }
          .print\\:p-2 { padding: 0.5rem !important; }
          .print\\:m-0 { margin: 0 !important; }
          .print\\:mb-1 { margin-bottom: 0.25rem !important; }
          .print\\:mb-2 { margin-bottom: 0.5rem !important; }
          .print\\:mt-2 { margin-top: 0.5rem !important; }
          .print\\:mt-12 { margin-top: 3rem !important; }
          .print\\:pt-6 { padding-top: 1.5rem !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:border-2 { border-width: 2px !important; }
          .print\\:justify-start { justify-content: flex-start !important; }
          .print\\:ml-4 { margin-left: 1rem !important; }
          .print\\:w-\\[40px\\] { width: 40px !important; }
          .print\\:text-\\[10px\\] { font-size: 10px !important; line-height: 12px !important;}

          @page {
            size: A4;
            margin: 0.5in; /* Standard A4 margin */
          }
          /* Ensure card takes full printable area */
          .max-w-4xl { 
            max-width: 100% !important;
            width: 100% !important;
            border: 1px solid black !important; /* Simple border for print if main border doesn't show */
          }
        }
      `}</style>
    </Card>
  );
}

    

