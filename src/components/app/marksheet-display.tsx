'use client';

import type * as React from 'react';
import type { MarksheetData } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Printer, FilePlus2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface MarksheetDisplayProps {
  data: MarksheetData;
  onCreateNew: () => void;
}

export function MarksheetDisplay({ data, onCreateNew }: MarksheetDisplayProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-xl print:shadow-none">
      <CardHeader className="text-center print:text-left">
        <CardTitle className="text-3xl text-primary">Student Marksheet</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="p-4 border rounded-lg bg-card shadow-sm">
          <h3 className="text-xl font-semibold mb-3 text-primary">Student Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div><strong>Name:</strong> {data.studentName}</div>
            <div><strong>ID:</strong> {data.studentId}</div>
            <div><strong>Class:</strong> {data.studentClass}</div>
          </div>
        </section>

        <section>
          <h3 className="text-xl font-semibold mb-3 text-primary">Subject Performance</h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold">Subject</TableHead>
                  <TableHead className="text-right font-bold">Marks Obtained</TableHead>
                  <TableHead className="text-right font-bold">Max Marks</TableHead>
                  <TableHead className="text-right font-bold">Percentage</TableHead>
                  <TableHead className="font-bold print:hidden">AI Feedback</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.subjects.map((subject, index) => (
                  <React.Fragment key={index}>
                    <TableRow>
                      <TableCell>{subject.subjectName}</TableCell>
                      <TableCell className="text-right">{subject.marksObtained}</TableCell>
                      <TableCell className="text-right">{subject.maxMarks}</TableCell>
                      <TableCell className="text-right">{subject.percentage.toFixed(2)}%</TableCell>
                      <TableCell className="text-sm text-muted-foreground italic print:hidden min-w-[250px] max-w-[400px]">{subject.feedback || 'N/A'}</TableCell>
                    </TableRow>
                    <TableRow className="hidden print:table-row">
                        <TableCell colSpan={4} className="text-sm text-muted-foreground italic py-1 px-2 border-t">
                           <strong>Feedback for {subject.subjectName}:</strong> {subject.feedback || 'N/A'}
                        </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
        
        <Separator />

        <section className="p-4 border rounded-lg bg-card shadow-sm">
          <h3 className="text-xl font-semibold mb-3 text-primary">Overall Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-md">
            <div><strong>Total Marks Obtained:</strong> {data.totalMarksObtained}</div>
            <div><strong>Total Maximum Marks:</strong> {data.totalMaxMarks}</div>
            <div className="md:col-span-2 text-lg font-bold text-primary">
              Overall Percentage: {data.overallPercentage.toFixed(2)}%
            </div>
          </div>
        </section>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-end gap-3 print:hidden">
        <Button variant="outline" onClick={onCreateNew}>
          <FilePlus2 className="mr-2 h-4 w-4" /> Create New Marksheet
        </Button>
        <Button variant="outline" onClick={() => alert('PDF Download functionality to be implemented.')}>
          <Download className="mr-2 h-4 w-4" /> Download PDF
        </Button>
        <Button onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" /> Print Marksheet
        </Button>
      </CardFooter>
    </Card>
  );
}
