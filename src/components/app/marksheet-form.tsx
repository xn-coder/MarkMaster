
'use client';

import React, { useEffect, useMemo } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { marksheetFormSchema, ACADEMIC_YEAR_OPTIONS, SUBJECT_CATEGORIES_OPTIONS } from './marksheet-form-schema';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PlusCircle, Trash2, CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useFieldArray } from 'react-hook-form';
import { getSubjectSuggestions, findSubjectTemplate } from '@/lib/subject-templates';


interface MarksheetFormProps {
  onSubmit: (data: MarksheetFormData) => void;
  isLoading: boolean;
  initialData?: Partial<MarksheetFormData>;
  isEditMode?: boolean;
}

const GENDERS: MarksheetFormData['gender'][] = ['Male', 'Female', 'Other'];
const FACULTIES: MarksheetFormData['faculty'][] = ['ARTS', 'COMMERCE', 'SCIENCE'];

const currentYear = new Date().getFullYear();
const startYearOptions = Array.from({ length: currentYear + 1 - 1990 + 1 }, (_, i) => 1990 + i).reverse();


export function MarksheetForm({ onSubmit, isLoading, initialData, isEditMode = false }: MarksheetFormProps) {
  const form = useForm<MarksheetFormData>({
    resolver: zodResolver(marksheetFormSchema),
    defaultValues: initialData || {
      studentName: '',
      fatherName: '',
      motherName: '',
      rollNumber: '',
      dateOfBirth: undefined,
      gender: undefined,
      faculty: undefined,
      academicYear: undefined,
      section: '',
      sessionStartYear: currentYear -1,
      sessionEndYear: currentYear,
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

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: 'subjects',
  });

  const watchedFaculty = form.watch('faculty');
  const watchedSessionStartYear = form.watch('sessionStartYear');

  useEffect(() => {
    if (watchedSessionStartYear) {
      form.setValue('sessionEndYear', watchedSessionStartYear + 1, { shouldValidate: true });
    }
  }, [watchedSessionStartYear, form.setValue]);

  useEffect(() => {
    if (initialData) {
      const processedInitialData = {
        ...initialData,
        dateOfBirth: initialData.dateOfBirth ? new Date(initialData.dateOfBirth) : undefined,
        subjects: initialData.subjects?.map(s => ({
            ...s,
            id: s.id || undefined, // Ensure id is explicitly string or undefined
            subjectName: s.subjectName || '',
            category: s.category || 'Compulsory',
            totalMarks: s.totalMarks !== undefined && s.totalMarks !== null ? Number(s.totalMarks) : 100,
            passMarks: s.passMarks !== undefined && s.passMarks !== null ? Number(s.passMarks) : 33,
            theoryMarksObtained: s.theoryMarksObtained !== undefined && s.theoryMarksObtained !== null ? Number(s.theoryMarksObtained) : 0,
            practicalMarksObtained: s.practicalMarksObtained !== undefined && s.practicalMarksObtained !== null ? Number(s.practicalMarksObtained) : 0,
        })) || [],
      };
      form.reset(processedInitialData);
    }
  }, [initialData, form.reset]);


  const handleFormSubmit = (data: MarksheetFormData) => {
    onSubmit(data);
  };

  return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)}>
          <div className="space-y-6 p-6 border rounded-lg shadow-lg bg-card mb-8">
             <h3 className="text-xl font-semibold text-primary border-b pb-2 mb-4">Student Information</h3>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                              format(new Date(field.value), "PPP")
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
                          selected={field.value ? new Date(field.value) : undefined}
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
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined} defaultValue={field.value || undefined}>
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
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                      }}
                      value={field.value || undefined}
                      defaultValue={field.value || undefined}
                    >
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="academicYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Academic Year (Class)</FormLabel>
                     <Select onValueChange={field.onChange} value={field.value || undefined} defaultValue={field.value || undefined}>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="sessionStartYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Session Start Year</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))} value={String(field.value || '')} >
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
                    <FormControl><Input type="number" value={field.value || ''} readOnly className="bg-muted/50 cursor-not-allowed" /></FormControl>
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
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g., 33"
                        {...field}
                        onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.value)} // Pass string or undefined
                        value={field.value ?? ''} // Display field.value or empty string
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="space-y-6 p-6 border rounded-lg shadow-lg bg-card">
            <h3 className="text-xl font-semibold text-primary border-b pb-2 mb-6">Subject Information</h3>

            <div className="hidden md:grid md:grid-cols-[minmax(0,_2fr)_1fr_0.75fr_0.75fr_0.75fr_0.75fr_minmax(0,_auto)] gap-x-3 gap-y-2 items-center mb-3 px-1">
              <Label className="font-semibold text-sm">Subject Name</Label>
              <Label className="font-semibold text-sm">Category</Label>
              <Label className="font-semibold text-sm text-center">Total Marks</Label>
              <Label className="font-semibold text-sm text-center">Pass Marks</Label>
              <Label className="font-semibold text-sm text-center">Theory Marks</Label>
              <Label className="font-semibold text-sm text-center">Practical Marks</Label>
              <Label className="font-semibold text-sm text-center">Action</Label>
            </div>

            {fields.map((item, index) => {
              const subjectCategory = form.watch(`subjects.${index}.category`);
              const subjectSuggestions = useMemo(() => getSubjectSuggestions(watchedFaculty, subjectCategory), [watchedFaculty, subjectCategory]);

              return (
              <div key={item.id} className="grid grid-cols-1 md:grid-cols-[minmax(0,_2fr)_1fr_0.75fr_0.75fr_0.75fr_0.75fr_minmax(0,_auto)] gap-x-3 gap-y-4 md:gap-y-3 items-start p-4 border rounded-md bg-secondary/20 shadow-sm">
                <FormField
                  control={form.control}
                  name={`subjects.${index}.subjectName`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="md:hidden">Subject Name</FormLabel>
                       <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          const template = findSubjectTemplate(value, watchedFaculty, subjectCategory);
                          if (template) {
                            form.setValue(`subjects.${index}.totalMarks`, template.totalMarks, {shouldValidate: true});
                            form.setValue(`subjects.${index}.passMarks`, template.passMarks, {shouldValidate: true});
                          }
                        }}
                        value={field.value || undefined}
                      >
                        <FormControl><SelectTrigger disabled={!watchedFaculty || !subjectCategory}><SelectValue placeholder="Select subject" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {subjectSuggestions.map(suggestion => (
                            <SelectItem key={suggestion.subjectName} value={suggestion.subjectName}>
                              {suggestion.subjectName}
                            </SelectItem>
                          ))}
                           {field.value && !subjectSuggestions.some(s => s.subjectName === field.value) && (
                            <SelectItem value={field.value} disabled>
                                {field.value} (Custom)
                            </SelectItem>
                           )}
                        </SelectContent>
                      </Select>
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
                      <Select
                        onValueChange={(value) => {
                            field.onChange(value);
                            const currentSubjectName = form.getValues(`subjects.${index}.subjectName`);
                            const newSuggestions = getSubjectSuggestions(watchedFaculty, value as SubjectEntryFormData['category']);
                            if(currentSubjectName && !newSuggestions.find(s => s.subjectName === currentSubjectName)) {
                                form.setValue(`subjects.${index}.subjectName`, '', {shouldValidate: true});
                                form.setValue(`subjects.${index}.totalMarks`, 100, {shouldValidate: true});
                                form.setValue(`subjects.${index}.passMarks`, 33, {shouldValidate: true});
                            }
                        }}
                        value={field.value || undefined}
                       >
                        <FormControl><SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {SUBJECT_CATEGORIES_OPTIONS.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
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
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Total"
                          {...field}
                          onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.value)}
                          value={field.value ?? ''}
                          className="text-center"
                        />
                      </FormControl>
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
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Pass"
                          {...field}
                          onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.value)}
                          value={field.value ?? ''}
                          className="text-center"
                        />
                      </FormControl>
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
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g. 70"
                          {...field}
                          onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.value)}
                          value={field.value ?? ''}
                          className="text-center"
                        />
                      </FormControl>
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
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g. 15"
                          {...field}
                          onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.value)}
                          value={field.value ?? ''}
                          className="text-center"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex items-center justify-center md:mt-0 md:pt-1">
                  {fields.length > 1 && (
                     <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => remove(index)}
                      className="mt-4 md:mt-0 h-9 w-9"
                      aria-label="Remove subject"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            )})}
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
          <div className="mt-8">
            <Button type="submit" className="w-full py-3 text-base" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin mr-2"/> : null}
              {isEditMode ? 'Update Marksheet Preview' : 'Generate Marksheet Preview'}
            </Button>
          </div>
        </form>
      </Form>
  );
}

