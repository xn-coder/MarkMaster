// components/app/marksheet-form.tsx

'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useForm, Controller, useWatch, useFieldArray } from 'react-hook-form';
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
import { format, toDate } from 'date-fns';
import { getSubjectSuggestions, findSubjectTemplate, DEFAULT_SUBJECTS_BY_FACULTY } from '@/lib/subject-templates';


interface MarksheetFormProps {
  onSubmit: (data: MarksheetFormData) => void;
  isLoading: boolean;
  initialData?: Partial<MarksheetFormData>;
  isEditMode?: boolean;
}

const GENDERS: MarksheetFormData['gender'][] = ['Male', 'Female', 'Other'];
const FACULTIES: MarksheetFormData['faculty'][] = ['ARTS', 'COMMERCE', 'SCIENCE'];

const currentYear = new Date().getFullYear();
const startYearOptions = Array.from({ length: currentYear + 5 - 1950 + 1 }, (_, i) => 1950 + i).reverse();


interface SubjectRowProps {
  control: any;
  index: number;
  remove: (index: number) => void;
  form: any;
  watchedFaculty: MarksheetFormData['faculty'] | undefined;
  isOnlySubject: boolean;
}

const SubjectRow: React.FC<SubjectRowProps> = ({ control, index, remove, form, watchedFaculty, isOnlySubject }) => {
  const subjectCategory = useWatch({
    control,
    name: `subjects.${index}.category`,
  });

  const subjectSuggestions = useMemo(() => getSubjectSuggestions(watchedFaculty, subjectCategory), [watchedFaculty, subjectCategory]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,_2.5fr)_1fr_0.75fr_0.75fr_0.75fr_0.75fr_0.75fr_minmax(0,_auto)] gap-x-3 gap-y-4 md:gap-y-3 items-start p-4 border rounded-md bg-secondary/20 shadow-sm">
      <FormField
        control={control}
        name={`subjects.${index}.subjectName`}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="md:hidden">Subject Name</FormLabel>
            <Select
              onValueChange={(value) => {
                field.onChange(value);
                const template = findSubjectTemplate(value, watchedFaculty, subjectCategory);
                if (template) {
                  form.setValue(`subjects.${index}.totalMarks`, template.totalMarks, { shouldValidate: true });
                  form.setValue(`subjects.${index}.theoryPassMarks`, template.theoryPassMarks, { shouldValidate: true }); // NEW
                  form.setValue(`subjects.${index}.practicalPassMarks`, template.practicalPassMarks, { shouldValidate: true }); // NEW
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
        control={control}
        name={`subjects.${index}.category`}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="md:hidden">Category</FormLabel>
            <Select
              onValueChange={(value) => {
                field.onChange(value);
                const currentSubjectName = form.getValues(`subjects.${index}.subjectName`);
                const newSuggestions = getSubjectSuggestions(watchedFaculty, value as SubjectEntryFormData['category']);
                if (currentSubjectName && !newSuggestions.find(s => s.subjectName === currentSubjectName)) {
                  form.setValue(`subjects.${index}.subjectName`, '', { shouldValidate: true });
                }
                const defaultTemplateForNewCategory = newSuggestions[0];
                form.setValue(`subjects.${index}.totalMarks`, defaultTemplateForNewCategory?.totalMarks || 100, { shouldValidate: true });
                form.setValue(`subjects.${index}.theoryPassMarks`, defaultTemplateForNewCategory?.theoryPassMarks || null, { shouldValidate: true }); // NEW
                form.setValue(`subjects.${index}.practicalPassMarks`, defaultTemplateForNewCategory?.practicalPassMarks || null, { shouldValidate: true }); // NEW
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
        control={control}
        name={`subjects.${index}.totalMarks`}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="md:hidden">Total Marks</FormLabel>
            <FormControl>
              <Input
                type="number"
                placeholder="Total"
                {...field}
                onChange={e => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))}
                value={field.value === undefined || field.value === null ? '' : String(field.value)}
                className="text-center"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {/* NEW FIELDS: Theory Pass Marks */}
      <FormField
        control={control}
        name={`subjects.${index}.theoryPassMarks`}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="md:hidden">Theory Pass</FormLabel>
            <FormControl>
              <Input
                type="number"
                placeholder="Th. Pass"
                {...field}
                onChange={e => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))}
                value={field.value === undefined || field.value === null ? '' : String(field.value)}
                className="text-center"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {/* NEW FIELDS: Practical Pass Marks */}
      <FormField
        control={control}
        name={`subjects.${index}.practicalPassMarks`}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="md:hidden">Practical Pass</FormLabel>
            <FormControl>
              <Input
                type="number"
                placeholder="Pr. Pass"
                {...field}
                onChange={e => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))}
                value={field.value === undefined || field.value === null ? '' : String(field.value)}
                className="text-center"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name={`subjects.${index}.theoryMarksObtained`}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="md:hidden">Theory Marks</FormLabel>
            <FormControl>
              <Input
                type="number"
                placeholder="e.g. 70"
                {...field}
                onChange={e => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))}
                value={field.value === undefined || field.value === null ? '' : String(field.value)}
                className="text-center"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name={`subjects.${index}.practicalMarksObtained`}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="md:hidden">Practical Marks</FormLabel>
            <FormControl>
              <Input
                type="number"
                placeholder="e.g. 15"
                {...field}
                onChange={e => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))}
                value={field.value === undefined || field.value === null ? '' : String(field.value)}
                className="text-center"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="flex items-center justify-center md:mt-0 md:pt-1">
        {!isOnlySubject && (
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
  );
};


export function MarksheetForm({ onSubmit, isLoading, initialData, isEditMode = false }: MarksheetFormProps) {
  const form = useForm<MarksheetFormData>({
    resolver: zodResolver(marksheetFormSchema),
    defaultValues: useMemo(() => {
      if (initialData) {
        const processedInitialData: MarksheetFormData = {
          system_id: initialData.system_id,
          studentName: initialData.studentName || '',
          fatherName: initialData.fatherName || '',
          motherName: initialData.motherName || '',
          rollNumber: initialData.rollNumber || '',
          registrationNo: initialData.registrationNo ?? null,
          dateOfBirth: initialData.dateOfBirth ? toDate(initialData.dateOfBirth) : new Date(),
          dateOfIssue: initialData.dateOfIssue ? toDate(initialData.dateOfIssue) : new Date(),
          gender: initialData.gender || undefined,
          faculty: initialData.faculty || undefined,
          academicYear: initialData.academicYear || undefined,
          sessionStartYear: initialData.sessionStartYear || currentYear -1,
          sessionEndYear: initialData.sessionEndYear || currentYear,
          overallPassingThresholdPercentage: initialData.overallPassingThresholdPercentage ?? 33, // Ensure default
          subjects: initialData.subjects?.map(s => ({
            ...s,
            id: s.id || crypto.randomUUID(),
            subjectName: s.subjectName || '',
            category: s.category || 'Compulsory',
            totalMarks: s.totalMarks !== undefined && s.totalMarks !== null ? Number(s.totalMarks) : 100,
            theoryPassMarks: s.theoryPassMarks !== undefined && s.theoryPassMarks !== null ? Number(s.theoryPassMarks) : null, // NEW
            practicalPassMarks: s.practicalPassMarks !== undefined && s.practicalPassMarks !== null ? Number(s.practicalPassMarks) : null, // NEW
            theoryMarksObtained: s.theoryMarksObtained !== undefined && s.theoryMarksObtained !== null ? Number(s.theoryMarksObtained) : 0,
            practicalMarksObtained: s.practicalMarksObtained !== undefined && s.practicalMarksObtained !== null ? Number(s.practicalMarksObtained) : 0,
          })) || [{
            id: crypto.randomUUID(),
            subjectName: '',
            category: 'Compulsory',
            totalMarks: 100,
            theoryPassMarks: null, // NEW
            practicalPassMarks: null, // NEW
            theoryMarksObtained: 0,
            practicalMarksObtained: 0,
          }],
        };
        return processedInitialData;
      }
      return {
        studentName: '',
        fatherName: '',
        motherName: '',
        rollNumber: '',
        registrationNo: null,
        dateOfBirth: new Date(),
        dateOfIssue: new Date(),
        gender: undefined,
        faculty: undefined,
        academicYear: undefined,
        sessionStartYear: currentYear - 1,
        sessionEndYear: currentYear,
        overallPassingThresholdPercentage: 33, // Default
        subjects: [{
          id: crypto.randomUUID(),
          subjectName: '',
          category: 'Compulsory',
          totalMarks: 100,
          theoryPassMarks: null, // NEW
          practicalPassMarks: null, // NEW
          theoryMarksObtained: 0,
          practicalMarksObtained: 0,
        }],
      };
    }, [initialData]),
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: 'subjects',
    keyName: "id",
  });

  const watchedFaculty = form.watch('faculty');
  const watchedSessionStartYear = form.watch('sessionStartYear');
  const prevFacultyRef = useRef<MarksheetFormData['faculty'] | undefined>(form.getValues('faculty'));

  const sessionEndYearOptions = useMemo(() => {
    if (watchedSessionStartYear) {
      const options = [];
      const endYearLimit = currentYear + 6;
      for (let i = watchedSessionStartYear + 1; i <= endYearLimit; i++) {
        options.push(i);
      }
      return options;
    }
    return [currentYear];
  }, [watchedSessionStartYear]);

  useEffect(() => {
    if (watchedSessionStartYear && watchedSessionStartYear !== form.formState.defaultValues?.sessionStartYear) {
      form.setValue('sessionEndYear', watchedSessionStartYear + 1, { shouldValidate: true });
    }
  }, [watchedSessionStartYear, form]);


  useEffect(() => {
    const newFaculty = watchedFaculty;
    const currentSubjects = form.getValues('subjects');

    if (!isEditMode && newFaculty && (newFaculty !== prevFacultyRef.current || (fields.length === 0 || (fields.length === 1 && !currentSubjects[0]?.subjectName))) ) {
      const defaultSubjectDefinitions = DEFAULT_SUBJECTS_BY_FACULTY[newFaculty];
      if (defaultSubjectDefinitions && defaultSubjectDefinitions.length > 0) {
        const newSubjects = defaultSubjectDefinitions.map(def => {
          const template = findSubjectTemplate(def.subjectName, newFaculty, def.category);
          return {
            id: crypto.randomUUID(),
            subjectName: def.subjectName,
            category: def.category,
            totalMarks: template?.totalMarks || 100,
            theoryPassMarks: template?.theoryPassMarks || null, // NEW
            practicalPassMarks: template?.practicalPassMarks || null, // NEW
            theoryMarksObtained: 0,
            practicalMarksObtained: 0,
          };
        });
        replace(newSubjects);
      } else {
         replace([{
            id: crypto.randomUUID(),
            subjectName: '',
            category: 'Compulsory',
            totalMarks: 100,
            theoryPassMarks: null, // NEW
            practicalPassMarks: null, // NEW
            theoryMarksObtained: 0,
            practicalMarksObtained: 0,
        }]);
      }
    }
    prevFacultyRef.current = newFaculty;
  }, [watchedFaculty, isEditMode, replace, fields.length, form]);


  const handleFormSubmit = (data: MarksheetFormData) => {
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)}>
        <div className="space-y-6 p-6 border rounded-lg shadow-lg bg-card mb-8">
          <h3 className="text-xl font-semibold text-primary border-b pb-2 mb-4">Student Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <FormField
              control={form.control}
              name="registrationNo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Registration No.</FormLabel>
                  <FormControl><Input placeholder="e.g., REG12345 (Optional)" {...field} value={field.value ?? ''} /></FormControl>
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
                            format(toDate(field.value), "PPP")
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
                        selected={field.value ? toDate(field.value) : undefined}
                        onSelect={field.onChange}
                        captionLayout="dropdown-buttons"
                        fromYear={1950}
                        toYear={currentYear}
                        classNames={{ caption_label: "hidden" }}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1950-01-01")
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
              name="dateOfIssue"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date of Issue</FormLabel>
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
                            format(toDate(field.value), "PPP")
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
                        selected={field.value ? toDate(field.value) : undefined}
                        onSelect={field.onChange}
                        captionLayout="dropdown-buttons"
                        fromYear={currentYear - 10}
                        toYear={currentYear + 10}
                        classNames={{ caption_label: "hidden" }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="sessionStartYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Session Start Year</FormLabel>
                  <Select
                    onValueChange={(value) => {
                        const startYear = value ? parseInt(value) : undefined;
                        field.onChange(startYear);
                    }}
                    value={String(field.value || '')}
                  >
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
                  <Select
                    onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                    value={String(field.value || '')}
                    disabled={!watchedSessionStartYear}
                  >
                    <FormControl><SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {sessionEndYearOptions.map(year => <SelectItem key={year} value={String(year)}>{year}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="space-y-6 p-6 border rounded-lg shadow-lg bg-card">
          <h3 className="text-xl font-semibold text-primary border-b pb-2 mb-6">Subject Information</h3>

          <div className="hidden md:grid md:grid-cols-[minmax(0,_2.5fr)_1fr_0.75fr_0.75fr_0.75fr_0.75fr_0.75fr_minmax(0,_auto)] gap-x-3 gap-y-2 items-center mb-3 px-1">
            <Label className="font-semibold text-sm">Subject Name</Label>
            <Label className="font-semibold text-sm">Category</Label>
            <Label className="font-semibold text-sm text-center">Total Marks</Label>
            <Label className="font-semibold text-sm text-center">Th. Pass</Label>{/* NEW HEADER */}
            <Label className="font-semibold text-sm text-center">Pr. Pass</Label>{/* NEW HEADER */}
            <Label className="font-semibold text-sm text-center">Theory Marks</Label>
            <Label className="font-semibold text-sm text-center">Practical Marks</Label>
            <Label className="font-semibold text-sm text-center">Action</Label>
          </div>

          {fields.map((item, index) => (
            <SubjectRow
              key={item.id}
              control={form.control}
              index={index}
              remove={remove}
              form={form}
              watchedFaculty={watchedFaculty}
              isOnlySubject={fields.length === 1}
            />
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() => append({
              id: crypto.randomUUID(),
              subjectName: '',
              category: 'Compulsory',
              totalMarks: 100,
              theoryPassMarks: null, // NEW DEFAULT
              practicalPassMarks: null, // NEW DEFAULT
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
            {isLoading ? <Loader2 className="animate-spin mr-2" /> : null}
            {isEditMode ? 'Update Marksheet Preview' : 'Generate Marksheet Preview'}
          </Button>
        </div>
      </form>
    </Form>
  );
}