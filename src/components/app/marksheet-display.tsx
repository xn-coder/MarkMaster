
'use client';

import type * as React from 'react';
import type { MarksheetDisplayData } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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

  const collegeNameColor = "#032781";
  const marksheetBannerBgColor = "#DB2A2A"; // A vibrant red
  const marksheetBannerTextColor = "#FFFFFF";

  // Calculate approximate height of the college details block for MARKSHEET banner positioning
  // This is an estimate and might need adjustment based on actual rendered height
  const collegeDetailsBlockHeight = "h-[80px]"; // Estimate based on font sizes and lines

  return (
    <div className="print:p-0 print:m-0">
      <Card className="w-full max-w-[210mm] min-h-[297mm] mx-auto shadow-lg print:shadow-none border-2 border-black print:border-2 print:border-black my-4 print:my-0 print:mx-0 print:min-h-0 flex flex-col">
        <div className="p-1 print:p-0.5 flex-grow flex flex-col">
          <div className="border border-black print:border-black p-4 print:p-3 h-full flex flex-col relative">
            
            <header className="relative mb-2 print:mb-1.5">
              <div className="absolute top-3 right-4 text-[10px] print:text-[8px] text-gray-700 print:text-black font-sans">
                www.saryugcollege.com
              </div>

              <div className="absolute top-3 left-4 print:top-2 print:left-3 z-10">
                  <Image 
                      src="/college-logo.png"
                      alt="College Logo" 
                      width={80} 
                      height={80}
                      className=""
                      data-ai-hint="college logo" 
                  />
              </div>
              
              <div className={`absolute left-1/2 transform -translate-x-1/2 text-center w-full top-3 print:top-2 ${collegeDetailsBlockHeight} flex flex-col items-center`}>
                  <h1 className="text-2xl font-bold print:text-xl leading-tight font-serif" style={{ color: collegeNameColor }}>SARYUG COLLEGE</h1>
                  <p className="text-sm font-semibold text-black print:text-xs leading-tight mt-0.5 font-sans">Chitragupta Nagar, Mohanpur, Samastipur, Bihar - 848101</p>
                  <p className="text-[11px] text-black print:text-[9px] leading-tight mt-0.5 font-sans">Affiliated By Bihar School Examination Board | [Estd. - 1983]</p>
                  <p className="text-[11px] text-black print:text-[9px] leading-tight font-sans">College Code: 53010</p>
              </div>

              <div className="text-center mt-[95px] print:mt-[90px] mb-2 print:mb-1.5"> {/* Adjusted margin-top */}
                <div 
                  className="inline-block px-8 py-1.5 rounded font-bold text-lg print:px-6 print:py-1 print:text-base"
                  style={{ backgroundColor: marksheetBannerBgColor, color: marksheetBannerTextColor }}
                >
                    MARKSHEET
                </div>
              </div>
            </header>

            <div className="text-center p-1 pt-0.5 mb-2 print:p-0.5 print:pt-0 print:mb-1.5">
              <h2 className="text-lg font-bold print:text-base border-b-2 border-black print:border-black pb-0.5 leading-tight" style={{ color: collegeNameColor }}>
                Student Details
              </h2>
            </div>
            
            <div className="flex-grow flex flex-col space-y-1.5 text-sm print:text-[10px] font-sans mb-2 print:mb-1.5">
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 mb-3 print:mb-2 text-black print:text-black">
                <div>Student Name: <strong className="font-semibold">{data.studentName}</strong></div>
                <div>Marksheet No: <strong className="font-semibold">{data.marksheetNo}</strong></div>
                <div>Father Name: <strong className="font-semibold">{data.fatherName}</strong></div>
                <div>Mother Name: <strong className="font-semibold">{data.motherName}</strong></div>
                <div>Session: <strong className="font-semibold">{data.sessionDisplay}</strong></div>
                <div>Roll No: <strong className="font-semibold">{data.rollNumber}</strong></div>
                <div>Date of Birth: <strong className="font-semibold">{format(new Date(data.dateOfBirth), "dd-MM-yyyy")}</strong></div>
                <div>Gender: <strong className="font-semibold">{data.gender}</strong></div>
                <div>Faculty: <strong className="font-semibold">{data.faculty}</strong></div>
                <div>Class: <strong className="font-semibold">{data.classDisplay}</strong></div>
              </div>

              <section className="flex-grow flex flex-col mb-3 print:mb-2">
                <div className="overflow-x-auto flex-grow">
                  <Table className="border border-black border-collapse print:text-[9px] w-full">
                    <TableHeader className="print:bg-gray-100">
                      <TableRow className="border-b border-black hover:bg-transparent print:hover:bg-transparent dark:hover:bg-inherit">
                        <TableHead rowSpan={2} className="w-[35px] border border-black font-bold text-black text-xs print:text-[9px] text-center align-middle p-0.5 print:p-0.25">Sr. no.</TableHead>
                        <TableHead rowSpan={2} className="min-w-[200px] border border-black font-bold text-black text-xs print:text-[9px] text-left align-middle p-1 print:p-0.5">Subject</TableHead>
                        <TableHead rowSpan={2} className="w-[70px] text-center border border-black font-bold text-black text-xs print:text-[9px] align-middle p-0.5 print:p-0.25">Total Marks</TableHead>
                        <TableHead rowSpan={2} className="w-[70px] text-center border border-black font-bold text-black text-xs print:text-[9px] align-middle p-0.5 print:p-0.25">Passing Marks</TableHead>
                        <TableHead colSpan={2} className="w-[130px] text-center border-t border-r border-l border-black font-bold text-black text-xs print:text-[9px] align-middle p-0.5 print:p-0.25">Marks Obtained</TableHead>
                        <TableHead rowSpan={2} className="w-[70px] text-center border border-black font-bold text-black text-xs print:text-[9px] align-middle p-0.5 print:p-0.25">Total</TableHead>
                      </TableRow>
                      <TableRow className="border-b border-black hover:bg-transparent print:hover:bg-transparent dark:hover:bg-inherit">
                        <TableHead className="w-[65px] text-center border-b border-r border-l border-black font-bold text-black text-xs print:text-[9px] align-middle p-0.5 print:p-0.25">Theory</TableHead>
                        <TableHead className="w-[65px] text-center border-b border-r border-black font-bold text-black text-xs print:text-[9px] align-middle p-0.5 print:p-0.25">Practical</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {compulsorySubjects.length > 0 && (
                        <TableRow className="font-semibold bg-muted/20 print:bg-gray-100 hover:bg-transparent print:hover:bg-transparent dark:hover:bg-inherit">
                          <TableCell colSpan={7} className="border border-black p-1 print:p-0.5 text-xs print:text-[9px]">COMPULSORY SUBJECTS</TableCell>
                        </TableRow>
                      )}
                      {compulsorySubjects.map((subject, index) => (
                        <TableRow key={`comp-${index}`} className="border-b border-black h-[22px] print:h-[20px] hover:bg-transparent print:hover:bg-transparent dark:hover:bg-inherit">
                          <TableCell className="text-center border-r border-l border-black p-0.5 print:p-0.25">{index + 1}</TableCell>
                          <TableCell className="border-r border-black p-1 print:p-0.5">{subject.subjectName}</TableCell>
                          <TableCell className="text-center border-r border-black p-0.5 print:p-0.25">{subject.totalMarks}</TableCell>
                          <TableCell className="text-center border-r border-black p-0.5 print:p-0.25">{subject.passMarks}</TableCell>
                          <TableCell className="text-center border-r border-black p-0.5 print:p-0.25">{subject.theoryMarksObtained}</TableCell>
                          <TableCell className="text-center border-r border-black p-0.5 print:p-0.25">{subject.practicalMarksObtained}</TableCell>
                          <TableCell className="text-center border-r border-black p-0.5 print:p-0.25 font-semibold">{subject.obtainedTotal}</TableCell>
                        </TableRow>
                      ))}
                      
                      {electiveSubjects.length > 0 && (
                        <TableRow className="font-semibold bg-muted/20 print:bg-gray-100 hover:bg-transparent print:hover:bg-transparent dark:hover:bg-inherit">
                          <TableCell colSpan={7} className="border border-black p-1 print:p-0.5 text-xs print:text-[9px]">ELECTIVE SUBJECTS</TableCell>
                        </TableRow>
                      )}
                      {electiveSubjects.map((subject, index) => (
                        <TableRow key={`elec-${index}`} className="border-b border-black h-[22px] print:h-[20px] hover:bg-transparent print:hover:bg-transparent dark:hover:bg-inherit">
                          <TableCell className="text-center border-r border-l border-black p-0.5 print:p-0.25">{compulsorySubjects.length + index + 1}</TableCell>
                          <TableCell className="border-r border-black p-1 print:p-0.5">{subject.subjectName}</TableCell>
                          <TableCell className="text-center border-r border-black p-0.5 print:p-0.25">{subject.totalMarks}</TableCell>
                          <TableCell className="text-center border-r border-black p-0.5 print:p-0.25">{subject.passMarks}</TableCell>
                          <TableCell className="text-center border-r border-black p-0.5 print:p-0.25">{subject.theoryMarksObtained}</TableCell>
                          <TableCell className="text-center border-r border-black p-0.5 print:p-0.25">{subject.practicalMarksObtained}</TableCell>
                          <TableCell className="text-center border-r border-black p-0.5 print:p-0.25 font-semibold">{subject.obtainedTotal}</TableCell>
                        </TableRow>
                      ))}

                      {additionalSubjects.length > 0 && (
                         <TableRow className="font-semibold bg-muted/20 print:bg-gray-100 hover:bg-transparent print:hover:bg-transparent dark:hover:bg-inherit">
                          <TableCell colSpan={7} className="border border-black p-1 print:p-0.5 text-xs print:text-[9px]">ADDITIONAL SUBJECTS</TableCell>
                        </TableRow>
                      )}
                       {additionalSubjects.map((subject, index) => (
                        <TableRow key={`add-${index}`} className="border-b border-black h-[22px] print:h-[20px] hover:bg-transparent print:hover:bg-transparent dark:hover:bg-inherit">
                          <TableCell className="text-center border-r border-l border-black p-0.5 print:p-0.25">{compulsorySubjects.length + electiveSubjects.length + index + 1}</TableCell>
                          <TableCell className="border-r border-black p-1 print:p-0.5">{subject.subjectName} (Addl.)</TableCell>
                          <TableCell className="text-center border-r border-black p-0.5 print:p-0.25">{subject.totalMarks}</TableCell>
                          <TableCell className="text-center border-r border-black p-0.5 print:p-0.25">{subject.passMarks}</TableCell>
                          <TableCell className="text-center border-r border-black p-0.5 print:p-0.25">{subject.theoryMarksObtained}</TableCell>
                          <TableCell className="text-center border-r border-black p-0.5 print:p-0.25">{subject.practicalMarksObtained}</TableCell>
                          <TableCell className="text-center border-r border-black p-0.5 print:p-0.25 font-semibold">{subject.obtainedTotal}</TableCell>
                        </TableRow>
                      ))}
                      
                      <TableRow className="border-t-2 border-black h-[24px] print:h-[22px] hover:bg-transparent print:hover:bg-transparent dark:hover:bg-inherit">
                        <TableCell colSpan={6} className="text-right font-bold border-r border-l border-black p-1 print:p-0.5 pr-2 print:pr-1.5 text-sm print:text-[10px]">AGGREGATE (Compulsory + Elective)</TableCell>
                        <TableCell className="text-center font-bold border-r border-black p-1 print:p-0.5 text-sm print:text-[10px]">{data.aggregateMarksCompulsoryElective}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </section>
              
              <Separator className="my-2.5 print:my-1.5" />

              <div className="grid grid-cols-2 items-start mt-1.5 print:mt-1 text-sm print:text-[10px] text-black print:text-black">
                <div>
                    <div>Result: <strong className={cn("font-semibold", data.overallResult === "Pass" ? "text-green-700" : "text-red-700")}>{data.overallResult} ({data.overallPercentageDisplay.toFixed(2)}%)</strong></div>
                    <div>Place: <strong className="font-semibold">{data.place}</strong></div>
                </div>
                <div className="text-right">Date of Issue: <strong className="font-semibold">{data.dateOfIssue}</strong></div>
              </div>
            </div>
            
            <div className="mt-auto pt-10 print:pt-8"> {/* Ensures this section is at the bottom */}
                <div className="flex justify-between text-sm print:text-[10px] text-black print:text-black">
                    <div className="text-center">
                        <hr className="border-black print:border-black mb-1 w-48 mx-auto" />
                        <span>Sign of Counter Clerk</span>
                    </div>
                    <div className="text-center">
                        <hr className="border-black print:border-black mb-1 w-48 mx-auto" />
                        <span>Sign of Principal</span>
                    </div>
                </div>
            </div>
          </div>
        </div>
      </Card>

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
            font-size: 10pt !important; 
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
          
          .print\\:text-\\[11px\\] { font-size: 11px !important; line-height: 1.2 !important;}
          .print\\:text-\\[10px\\] { font-size: 10px !important; line-height: 1.2 !important;}
          .print\\:text-\\[9px\\] { font-size: 9px !important; line-height: 1.2 !important;}
          .print\\:text-\\[8px\\] { font-size: 8px !important; line-height: 1.2 !important;}
          .print\\:text-xs { font-size: 0.75rem !important; line-height: 1.2 !important; } 
          .print\\:text-sm { font-size: 0.875rem !important; line-height: 1.2 !important; } 
          .print\\:text-base { font-size: 1rem !important; line-height: 1.3 !important; } 
          .print\\:text-lg { font-size: 1.125rem !important; line-height: 1.3 !important; } 
          .print\\:text-xl { font-size: 1.25rem !important; line-height: 1.3 !important; } 

          .print\\:p-0\\.25 { padding: 0.0625rem !important; } 
          .print\\:p-0\\.5 { padding: 0.125rem !important; }
          .print\\:p-1 { padding: 0.25rem !important; }
          .print\\:p-1\\.5 { padding: 0.375rem !important; }
          .print\\:p-2 { padding: 0.5rem !important; }
          .print\\:p-2\\.5 { padding: 0.625rem !important; } 
          .print\\:p-3 { padding: 0.75rem !important; } 

          .print\\:mb-0\\.5 { margin-bottom: 0.125rem !important; }
          .print\\:mb-1 { margin-bottom: 0.25rem !important; }
          .print\\:mb-1\\.5 { margin-bottom: 0.375rem !important; }
          .print\\:mb-2 { margin-bottom: 0.5rem !important; }
          .print\\:mt-0 { margin-top: 0rem !important; }
          .print\\:mt-0\\.5 { margin-top: 0.125rem !important; }
          .print\\:mt-1 { margin-top: 0.25rem !important; }
          .print\\:mt-\\[90px\\] { margin-top: 90px !important; } /* For MARKSHEET banner positioning */
          .print\\:pt-0 { padding-top: 0rem !important; }
          .print\\:pt-8 { padding-top: 2rem !important; }


          .print\\:shadow-none { box-shadow: none !important; }
          
          .max-w-\\[210mm\\].min-h-\\[297mm\\] { 
            width: 100% !important; 
            min-height: calc(297mm - 20mm) !important; /* Attempt to fill page height within margins */
            max-width: none !important; 
            box-sizing: border-box !important;
            display: flex !important;
            flex-direction: column !important;
            page-break-inside: avoid !important;
          }
          
          table, th, td {
             border: 1px solid black !important;
             border-collapse: collapse !important; 
             page-break-inside: avoid !important;
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
            margin: 10mm; 
          }
        }
      `}</style>
    </div>
  );
}

