import { useEffect, useState } from 'react';
import { Venue } from '../types/venue';
import { useSeatStore } from '../store/seatStore';

export function useVenueData() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const setVenue = useSeatStore((s) => s.setVenue);

  useEffect(() => {
    fetch('/venue.json')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load venue data');
        return res.json();
      })
      .then((data: Venue) => {
        setVenue(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [setVenue]);

  return { loading, error };
}
