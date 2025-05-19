
'use client';

import type * as React from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { marksheetFormSchema } from './marksheet-form-schema';
import type { MarksheetFormData, SubjectEntryFormData } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PlusCircle, XCircle, CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface MarksheetFormProps {
  onSubmit: (data: MarksheetFormData) => void;
  isLoading: boolean;
}

const GENDERS: MarksheetFormData['gender'][] = ['Male', 'Female', 'Other'];
const FACULTIES: MarksheetFormData['faculty'][] = ['ARTS', 'COMMERCE', 'SCIENCE'];
const SUBJECT_CATEGORIES: SubjectEntryFormData['category'][] = ['Compulsory', 'Elective', 'Additional'];


export function MarksheetForm({ onSubmit, isLoading }: MarksheetFormProps) {
  const form = useForm<MarksheetFormData>({
    resolver: zodResolver(marksheetFormSchema),
    defaultValues: {
      studentName: '',
      fatherName: '',
      motherName: '',
      rollNumber: '',
      dateOfBirth: undefined,
      gender: undefined,
      faculty: undefined,
      academicYear: '',
      studentClass: '',
      section: '',
      sessionStartYear: new Date().getFullYear() -1,
      sessionEndYear: new Date().getFullYear(),
      overallPassingThresholdPercentage: 33,
      subjects: [{ 
        subjectName: '', 
        category: 'Compulsory', 
        totalMarks: 100, 
        passMarks: 33,
        theoryMarksObtained: 0,
        practicalMarksObtained: 0,
      }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'subjects',
  });

  const handleFormSubmit = (data: MarksheetFormData) => {
    onSubmit(data);
  };

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl text-primary">Create New Marksheet</CardTitle>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)}>
          <CardContent className="space-y-6">
            {/* Student Information Section */}
            <div className="space-y-4 p-4 border rounded-md shadow-sm">
              <h3 className="text-lg font-semibold text-primary">Student Information</h3>
              <FormField
                control={form.control}
                name="studentName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Student Name</FormLabel>
                    <FormControl><Input placeholder="Full Name" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fatherName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Father's Name</FormLabel>
                      <FormControl><Input placeholder="Father's Full Name" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="motherName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mother's Name</FormLabel>
                      <FormControl><Input placeholder="Mother's Full Name" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="rollNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Roll Number</FormLabel>
                      <FormControl><Input placeholder="e.g., 101" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date of Birth</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="faculty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Faculty</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select faculty" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {FACULTIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <FormField
                  control={form.control}
                  name="academicYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Academic Year</FormLabel>
                      <FormControl><Input placeholder="e.g., 2023-2024" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="studentClass"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class</FormLabel>
                      <FormControl><Input placeholder="e.g., 12th" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="section"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Section</FormLabel>
                      <FormControl><Input placeholder="e.g., A" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="sessionStartYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Session Start Year</FormLabel>
                      <FormControl><Input type="number" placeholder="e.g., 2023" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sessionEndYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Session End Year</FormLabel>
                      <FormControl><Input type="number" placeholder="e.g., 2024" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="overallPassingThresholdPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Overall Passing %</FormLabel>
                      <FormControl><Input type="number" placeholder="e.g., 33" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Subject Information Section */}
            <div className="space-y-4 p-4 border rounded-md shadow-sm">
              <h3 className="text-lg font-semibold text-primary">Subject Information</h3>
              {fields.map((item, index) => (
                <div key={item.id} className="p-3 border rounded-md bg-secondary/20 space-y-3">
                  <div className="flex justify-between items-center">
                    <Label className="text-md font-medium">Subject {index + 1}</Label>
                    {fields.length > 1 && (
                       <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                        className="text-destructive hover:text-destructive-foreground hover:bg-destructive"
                        aria-label="Remove subject"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <FormField
                    control={form.control}
                    name={`subjects.${index}.subjectName`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject Name</FormLabel>
                        <FormControl><Input placeholder="e.g., Physics" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`subjects.${index}.category`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {SUBJECT_CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`subjects.${index}.totalMarks`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total Marks</FormLabel>
                          <FormControl><Input type="number" placeholder="e.g., 100" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`subjects.${index}.passMarks`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pass Marks</FormLabel>
                          <FormControl><Input type="number" placeholder="e.g., 33" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`subjects.${index}.theoryMarksObtained`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Theory Marks Obtained</FormLabel>
                          <FormControl><Input type="number" placeholder="e.g., 50" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`subjects.${index}.practicalMarksObtained`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Practical Marks Obtained</FormLabel>
                          <FormControl><Input type="number" placeholder="e.g., 20" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => append({ 
                    subjectName: '', 
                    category: 'Compulsory', 
                    totalMarks: 100, 
                    passMarks: 33,
                    theoryMarksObtained: 0,
                    practicalMarksObtained: 0
                })}
                className="w-full"
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Another Subject
              </Button>
              {form.formState.errors.subjects && !form.formState.errors.subjects.root && (
                 <p className="text-sm font-medium text-destructive">{form.formState.errors.subjects.message}</p>
              )}
              {form.formState.errors.subjects?.root && (
                <p className="text-sm font-medium text-destructive">{form.formState.errors.subjects.root.message}</p>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin mr-2"/> : null} 
              Generate Marksheet Preview
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

    