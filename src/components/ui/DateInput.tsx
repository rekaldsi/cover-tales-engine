import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DateInputProps {
  value?: string; // YYYY-MM-DD format
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}

const MONTHS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

// Generate years from 1930 to current year
const YEARS = Array.from(
  { length: new Date().getFullYear() - 1930 + 1 },
  (_, i) => (new Date().getFullYear() - i).toString()
);

// Generate days 1-31
const DAYS = Array.from({ length: 31 }, (_, i) => 
  (i + 1).toString().padStart(2, '0')
);

export function DateInput({ value, onChange, label, className }: DateInputProps) {
  // Parse value into year, month, day
  const [year, month, day] = value ? value.split('-') : ['', '', ''];

  const handleYearChange = (newYear: string) => {
    const m = month || '01';
    const d = day || '01';
    onChange(`${newYear}-${m}-${d}`);
  };

  const handleMonthChange = (newMonth: string) => {
    const y = year || new Date().getFullYear().toString();
    const d = day || '01';
    onChange(`${y}-${newMonth}-${d}`);
  };

  const handleDayChange = (newDay: string) => {
    const y = year || new Date().getFullYear().toString();
    const m = month || '01';
    onChange(`${y}-${m}-${newDay}`);
  };

  return (
    <div className={className}>
      {label && <Label className="mb-2 block text-sm">{label}</Label>}
      <div className="grid grid-cols-3 gap-2">
        {/* Year - most important, goes first */}
        <Select value={year} onValueChange={handleYearChange}>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent className="max-h-60 bg-popover">
            {YEARS.map((y) => (
              <SelectItem key={y} value={y}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Month */}
        <Select value={month} onValueChange={handleMonthChange}>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent className="max-h-60 bg-popover">
            {MONTHS.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Day */}
        <Select value={day} onValueChange={handleDayChange}>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Day" />
          </SelectTrigger>
          <SelectContent className="max-h-60 bg-popover">
            {DAYS.map((d) => (
              <SelectItem key={d} value={d}>{parseInt(d)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
