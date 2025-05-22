import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const units: string[] = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
];

const tens: string[] = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

const scales: string[] = ['', 'Thousand', 'Million', 'Billion', 'Trillion']; // Add more if needed

/**
 * Converts a number less than 1000 into its word representation.
 * @param {number} num - The number to convert (0-999).
 * @returns {string} The word representation.
 */
function convertLessThanOneThousand(num: number): string {
  if (num === 0) {
    return '';
  }

  let currentWords = '';

  if (num < 20) {
    currentWords = units[num];
  } else {
    currentWords = tens[Math.floor(num / 10)];
    if (num % 10 !== 0) {
      currentWords += (currentWords ? ' ' : '') + units[num % 10];
    }
  }
  return currentWords;
}

/**
 * Converts a non-negative integer into its English word representation.
 * @param {number} num - The number to convert.
 * @returns {string} The word representation (e.g., "Five Hundred Twenty Three").
 *                   Returns "Zero" for 0.
 *                   Returns an empty string for negative numbers or non-integers for simplicity in this context,
 *                   but you could extend it to handle them.
 */
export function numberToWords(num: number): string {
  if (num === 0) {
    return 'Zero';
  }

  // For this use case, we'll assume positive integers.
  // You can add handling for negative or decimal numbers if needed.
  if (num < 0 || !Number.isInteger(num)) {
    console.warn("numberToWords: Function currently supports non-negative integers only.");
    return ''; // Or throw an error, or handle negatives: "Minus " + numberToWords(Math.abs(num))
  }

  let word = '';
  let scaleIndex = 0;

  while (num > 0) {
    if (num % 1000 !== 0) {
      const hundreds = Math.floor((num % 1000) / 100);
      const remainder = num % 100;
      let segmentWords = '';

      if (hundreds > 0) {
        segmentWords += units[hundreds] + ' Hundred';
      }

      if (remainder > 0) {
        if (segmentWords) {
          segmentWords += ' ';
        }
        segmentWords += convertLessThanOneThousand(remainder);
      }
      
      if (segmentWords) {
        word = segmentWords + (scales[scaleIndex] ? ' ' + scales[scaleIndex] : '') + (word ? ' ' + word : '');
      }
    }
    num = Math.floor(num / 1000);
    scaleIndex++;
  }

  return word.trim();
}
