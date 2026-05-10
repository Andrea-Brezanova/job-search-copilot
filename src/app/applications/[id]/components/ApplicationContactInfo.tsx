type ApplicationContactInfoProps = {
  contactName: string;
  contactEmail: string;
  jobUrl: string;
  onContactNameChange: (value: string) => void;
  onContactEmailChange: (value: string) => void;
  onJobUrlChange: (value: string) => void;
};

export function ApplicationContactInfo({
  contactName,
  contactEmail,
  jobUrl,
  onContactNameChange,
  onContactEmailChange,
  onJobUrlChange,
}: ApplicationContactInfoProps) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-stone-900">
          Contact &amp; source
        </h2>
        <p className="mt-1 text-sm text-stone-600">
          Save the recruiter contact details and the source link for later follow-ups.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm text-stone-700">
          <span className="font-medium text-stone-800">Contact name</span>
          <input
            type="text"
            value={contactName}
            onChange={(event) => onContactNameChange(event.target.value)}
            placeholder="Hiring manager or recruiter"
            className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </label>

        <label className="grid gap-2 text-sm text-stone-700">
          <span className="font-medium text-stone-800">Contact email</span>
          <input
            type="email"
            value={contactEmail}
            onChange={(event) => onContactEmailChange(event.target.value)}
            placeholder="recruiter@example.com"
            className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </label>

        <label className="grid gap-2 text-sm text-stone-700 md:col-span-2">
          <span className="font-medium text-stone-800">Job URL</span>
          <input
            type="url"
            value={jobUrl}
            onChange={(event) => onJobUrlChange(event.target.value)}
            placeholder="https://company.com/jobs/role"
            className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </label>
      </div>
    </section>
  );
}
