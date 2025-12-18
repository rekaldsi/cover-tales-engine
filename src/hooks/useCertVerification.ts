import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GradeStatus } from '@/types/comic';
import { toast } from 'sonner';

interface CertDetails {
  certNumber: string;
  company: 'cgc' | 'cbcs' | 'pgx';
  verified: boolean;
  grade?: string;
  title?: string;
  issue?: string;
  publisher?: string;
  pageQuality?: string;
  labelType?: string;
  graderNotes?: string[];
  gradedDate?: string;
  error?: string;
}

export function useCertVerification() {
  const [isVerifying, setIsVerifying] = useState(false);
  const [certDetails, setCertDetails] = useState<CertDetails | null>(null);

  const verifyCert = async (certNumber: string, gradeStatus: GradeStatus): Promise<CertDetails | null> => {
    if (gradeStatus === 'raw' || !certNumber) {
      toast.error('No certificate number to verify');
      return null;
    }

    setIsVerifying(true);
    setCertDetails(null);

    try {
      const { data, error } = await supabase.functions.invoke('fetch-cert-details', {
        body: { certNumber, company: gradeStatus }
      });

      if (error) {
        console.error('Cert verification error:', error);
        toast.error('Failed to verify certificate');
        return null;
      }

      const details = data as CertDetails;
      setCertDetails(details);

      if (details.verified) {
        toast.success(`Certificate verified with ${gradeStatus.toUpperCase()}`);
      } else {
        toast.warning(details.error || 'Certificate could not be verified');
      }

      return details;
    } catch (error) {
      console.error('Cert verification error:', error);
      toast.error('Failed to verify certificate');
      return null;
    } finally {
      setIsVerifying(false);
    }
  };

  const clearDetails = () => {
    setCertDetails(null);
  };

  return {
    verifyCert,
    isVerifying,
    certDetails,
    clearDetails,
  };
}
