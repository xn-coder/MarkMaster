'use client';

import type * as React from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { studentFormSchema } from './student-form-schema';
import type { StudentFormData } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PlusCircle, XCircle } from 'lucide-react';

interface StudentFormProps {
  onSubmit: (data: StudentFormData) => void;
  isLoading: boolean;
}

export function StudentForm({ onSubmit, isLoading }: StudentFormProps) {
  const form = useForm<StudentFormData>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      studentName: '',
      studentId: '',
      studentClass: '',
      subjects: [{ subjectName: '', marksObtained: 0, maxMarks: 100 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'subjects',
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
                name="studentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Student ID</FormLabel>
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
                    <FormControl>
                      <Input placeholder="e.g., 10th Grade A" {...field} />
                    </FormControl>
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
                            <Input type="number" placeholder="e.g., 85" {...field} />
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
                            <Input type="number" placeholder="e.g., 100" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {fields.length > 1 && (
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
                onClick={() => append({ subjectName: '', marksObtained: 0, maxMarks: 100 })}
                className="w-full"
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
              {isLoading ? 'Generating...' : 'Generate Marksheet'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
