import AppLayout from './AppLayout';

function Bar({ className = '' }: { className?: string }) {
  return <div className={`bg-line/60 rounded-[10px] animate-pulse motion-reduce:animate-none ${className}`} />;
}

/**
 * Generisk innholds-skjelett vist mens en autentisert side henter data.
 * Rammen (header/sidebar/bunnmeny) vises umiddelbart via AppLayout, så brukeren
 * ser at noe skjer i stedet for blank skjerm.
 */
export default function PageSkeleton() {
  return (
    <AppLayout>
      <div className="flex flex-col gap-4">
        <Bar className="h-8 w-1/2 max-w-[260px]" />

        {/* stat-rad */}
        <div className="flex gap-3">
          <Bar className="h-16 flex-1" />
          <Bar className="h-16 flex-1" />
          <Bar className="h-16 flex-1" />
        </div>

        {/* liste-kort */}
        <div className="flex flex-col gap-3 mt-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 border border-line rounded-[14px] p-3">
              <Bar className="h-[72px] w-[72px] flex-shrink-0" />
              <div className="flex-1 min-w-0 flex flex-col gap-2">
                <Bar className="h-4 w-2/3" />
                <Bar className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
