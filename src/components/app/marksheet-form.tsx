
'use client';

import React, { useEffect } from 'react'; // Added useEffect
import { useForm, Controller } from 'react-hook-form'; // Removed useFieldArray temporarily, will re-add
import { zodResolver } from '@hookform/resolvers/zod';
import { marksheetFormSchema, ACADEMIC_YEAR_OPTIONS } from './marksheet-form-schema';
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
import { PlusCircle, Trash2, CalendarIcon, Loader2 } from 'lucide-react'; // Changed XCircle to Trash2
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useFieldArray } from 'react-hook-form'; // Re-added useFieldArray

interface MarksheetFormProps {
  onSubmit: (data: MarksheetFormData) => void;
  isLoading: boolean;
}

const GENDERS: MarksheetFormData['gender'][] = ['Male', 'Female', 'Other'];
const FACULTIES: MarksheetFormData['faculty'][] = ['ARTS', 'COMMERCE', 'SCIENCE'];
const SUBJECT_CATEGORIES: SubjectEntryFormData['category'][] = ['Compulsory', 'Elective', 'Additional'];

const currentYear = new Date().getFullYear();
const startYearOptions = Array.from({ length: currentYear + 1 - 1990 + 1 }, (_, i) => 1990 + i);


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
      academicYear: undefined,
      section: '',
      sessionStartYear: currentYear - 1,
      sessionEndYear: currentYear, // This will be updated by useEffect
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

  const watchedSessionStartYear = form.watch('sessionStartYear');

  useEffect(() => {
    if (watchedSessionStartYear) {
      form.setValue('sessionEndYear', watchedSessionStartYear + 1, { shouldValidate: true });
    }
  }, [watchedSessionStartYear, form]);

  const handleFormSubmit = (data: MarksheetFormData) => {
    onSubmit(data);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-xl"> {/* Increased max-width for new layout */}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="academicYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Academic Year</FormLabel>
                       <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select academic year" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {ACADEMIC_YEAR_OPTIONS.map(ay => <SelectItem key={ay} value={ay}>{ay}</SelectItem>)}
                        </SelectContent>
                      </Select>
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
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} value={String(field.value || '')}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {startYearOptions.map(year => <SelectItem key={year} value={String(year)}>{year}</SelectItem>)}
                        </SelectContent>
                      </Select>
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
                      <FormControl><Input type="number" {...field} readOnly className="bg-muted/50 cursor-not-allowed" /></FormControl>
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
              <h3 className="text-lg font-semibold text-primary mb-4">Subject Information</h3>
              
              {/* Subject Headers */}
              <div className="hidden md:grid md:grid-cols-[minmax(0,_2fr)_1fr_0.75fr_0.75fr_0.75fr_0.75fr_minmax(0,_auto)] gap-x-3 gap-y-1 items-center mb-2 px-1">
                <Label className="font-semibold text-sm">Subject Name</Label>
                <Label className="font-semibold text-sm">Category</Label>
                <Label className="font-semibold text-sm text-center">Total</Label>
                <Label className="font-semibold text-sm text-center">Pass</Label>
                <Label className="font-semibold text-sm text-center">Theory</Label>
                <Label className="font-semibold text-sm text-center">Practical</Label>
                <Label className="font-semibold text-sm text-center">Action</Label>
              </div>

              {fields.map((item, index) => (
                <div key={item.id} className="grid grid-cols-1 md:grid-cols-[minmax(0,_2fr)_1fr_0.75fr_0.75fr_0.75fr_0.75fr_minmax(0,_auto)] gap-x-3 gap-y-3 items-start p-3 border rounded-md bg-secondary/10">
                  <FormField
                    control={form.control}
                    name={`subjects.${index}.subjectName`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="md:hidden">Subject Name</FormLabel>
                        <FormControl><Input placeholder="Subject Name" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`subjects.${index}.category`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="md:hidden">Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {SUBJECT_CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`subjects.${index}.totalMarks`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="md:hidden">Total Marks</FormLabel>
                        <FormControl><Input type="number" placeholder="Total" {...field} className="text-center" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`subjects.${index}.passMarks`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="md:hidden">Pass Marks</FormLabel>
                        <FormControl><Input type="number" placeholder="Pass" {...field} className="text-center" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`subjects.${index}.theoryMarksObtained`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="md:hidden">Theory Marks</FormLabel>
                        <FormControl><Input type="number" placeholder="e.g. 70" {...field} className="text-center" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`subjects.${index}.practicalMarksObtained`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="md:hidden">Practical Marks</FormLabel>
                        <FormControl><Input type="number" placeholder="e.g. 15" {...field} className="text-center" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex items-center justify-center md:mt-0"> {/* Adjusted for centering button */}
                    {fields.length > 1 && (
                       <Button
                        type="button"
                        variant="destructive"
                        size="icon" // Make it an icon button
                        onClick={() => remove(index)}
                        className="mt-6 md:mt-0" // Add margin top for mobile, remove for md
                        aria-label="Remove subject"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
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
                className="w-full mt-4"
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Subject
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

