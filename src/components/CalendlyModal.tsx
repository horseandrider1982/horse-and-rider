import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useBookingUrl } from "@/hooks/useCalendlyUrl";
import { Loader2 } from "lucide-react";

interface BookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CalendlyModal = ({ open, onOpenChange }: BookingModalProps) => {
  const { data: bookingUrl, isLoading } = useBookingUrl();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Online Beratung buchen</DialogTitle>
        </DialogHeader>
        <div className="w-full min-h-[500px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-[500px]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : bookingUrl ? (
            <iframe
              src={bookingUrl}
              width="100%"
              height="500"
              frameBorder="0"
              title="Online Beratung buchen"
              className="rounded-md"
            />
          ) : (
            <div className="flex items-center justify-center h-[500px] text-muted-foreground">
              <p>Online Beratung ist derzeit nicht verfügbar.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
