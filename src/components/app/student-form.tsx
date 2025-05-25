'use client';

import type * as React from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form'; // Controller might not be strictly needed here, but doesn't hurt
import { zodResolver } from '@hookform/resolvers/zod';
import { studentFormSchema, ACADEMIC_YEAR_OPTIONS } from './student-form-schema'; // Import ACADEMIC_YEAR_OPTIONS
import type { StudentFormData } from '@/types'; // Ensure StudentFormData matches the schema
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  Select, // Import Select components for dropdowns
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PlusCircle, XCircle, Loader2 } from 'lucide-react'; // Added Loader2 for button loading state

interface StudentFormProps {
  onSubmit: (data: StudentFormData) => void;
  isLoading: boolean;
}

export function StudentForm({ onSubmit, isLoading }: StudentFormProps) {
  const form = useForm<StudentFormData>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      studentName: '',
      rollNumber: '', // Renamed from studentId
      studentClass: undefined, // Changed to undefined to allow Select placeholder
      subjects: [{ id: crypto.randomUUID(), subjectName: '', marksObtained: 0, maxMarks: 100 }], // Added id for useFieldArray
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'subjects',
    keyName: 'id', // Use 'id' for unique keys
  });

  const handleFormSubmit = (data: StudentFormData) => {
    onSubmit(data);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl text-primary">Enter Student Details</CardTitle>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="studentName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Student Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="rollNumber" // Changed from studentId
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Roll Number</FormLabel> {/* Changed label */}
                    <FormControl>
                      <Input placeholder="e.g., S12345" {...field} />
                    </FormControl>
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
                    <Select onValueChange={field.onChange} value={field.value || undefined}> {/* Use Select for enum */}
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select class" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ACADEMIC_YEAR_OPTIONS.map((cls) => (
                          <SelectItem key={cls} value={cls}>
                            {cls}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <Label className="text-lg font-semibold">Subjects</Label>
              {fields.map((item, index) => (
                <div key={item.id} className="p-4 border rounded-md shadow-sm bg-secondary/30 space-y-3">
                  <FormField
                    control={form.control}
                    name={`subjects.${index}.subjectName`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Mathematics" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <FormField
                      control={form.control}
                      name={`subjects.${index}.marksObtained`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Marks Obtained</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="e.g., 85"
                              {...field}
                              onChange={e => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))} // Handle empty string to undefined
                              value={field.value === undefined ? '' : String(field.value)} // Display empty string for undefined
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`subjects.${index}.maxMarks`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Marks</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="e.g., 100"
                              {...field}
                              onChange={e => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))} // Handle empty string to undefined
                              value={field.value === undefined ? '' : String(field.value)} // Display empty string for undefined
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {fields.length > 1 && ( // Only show remove button if more than one subject
                       <Button
                        type="button"
                        variant="destructive"
                        onClick={() => remove(index)}
                        className="w-full md:w-auto self-end"
                        aria-label="Remove subject"
                      >
                        <XCircle className="mr-2 h-4 w-4" /> Remove
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => append({ id: crypto.randomUUID(), subjectName: '', marksObtained: 0, maxMarks: 100 })} // Ensure new subjects have an ID
                className="w-full"
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Subject
              </Button>
              {/* Display general subject array errors */}
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
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} {/* Loading spinner */}
              {isLoading ? 'Generating...' : 'Generate Marksheet'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}