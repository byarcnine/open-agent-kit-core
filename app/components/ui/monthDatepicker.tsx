import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "react-feather";
import { Form } from "react-router";

interface MonthDatepickerProps {
  onMonthSelect?: (date: Date) => void;
  defaultMonth?: Date;
  placeholder?: string;
  className?: string;
  name?: string;
  selectedMonth: Date;
}

const MonthDatepicker = ({
  placeholder = "Select month",
  className = "",
  name,
  selectedMonth,
}: MonthDatepickerProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isOpen, setIsOpen] = useState(false);

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const handlePrevYear = () => {
    setCurrentDate(new Date(currentYear - 1, currentMonth));
  };

  const handleNextYear = () => {
    setCurrentDate(new Date(currentYear + 1, currentMonth));
  };

  const formatSelectedMonth = () => {
    if (!selectedMonth) return placeholder;
    return `${months[selectedMonth.getMonth()]} ${selectedMonth.getFullYear()}`;
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-3 text-left flex items-center justify-between hover:border-gray-300 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-gray-900 text-sm">{formatSelectedMonth()}</span>
        </div>
        <ChevronRight
          className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-neutral-200 rounded-lg shadow-lg z-10">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <button
              onClick={handlePrevYear}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <span className="text-sm font-medium text-gray-900">
              {currentYear}
            </span>
            <button
              onClick={handleNextYear}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          <div className="p-3">
            <Form method="get">
              <div className="grid grid-cols-3 gap-1">
                {months.map((month, index) => {
                  const isSelected =
                    selectedMonth &&
                    selectedMonth.getMonth() === index &&
                    selectedMonth.getFullYear() === currentYear;
                  const isCurrentMonth =
                    new Date().getMonth() === index &&
                    new Date().getFullYear() === currentYear;

                  return (
                    <button
                      key={month}
                      name={name}
                      type="submit"
                      value={`${currentYear}-${(index + 1).toString().padStart(2, "0")}-15T12:00:00.000Z`}
                      className={`p-3 text-xs rounded-lg transition-colors ${
                        isSelected
                          ? "bg-black text-white"
                          : isCurrentMonth
                            ? "bg-blue-50 text-blue-600"
                            : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {month.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </Form>
          </div>
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-0" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
};

export default MonthDatepicker;
