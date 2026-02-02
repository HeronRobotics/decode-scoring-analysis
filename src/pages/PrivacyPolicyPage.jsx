function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen p-3 sm:p-5 max-w-7xl mx-auto">
      <div className="my-6 sm:my-8">
        <h1 className="text-3xl sm:text-5xl font-bold">Privacy Policy</h1>
        <p className="mt-4 text-sm text-brand-text">
          Last updated: January 19, 2026
        </p>
      </div>

      <div className="bg-brand-bg border-2 border-brand-border p-4 sm:p-6 space-y-5 text-sm sm:text-base leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold mb-2">1. Overview</h2>
          <p>
            Heronscout helps you record and analyze match data for scouting
            purposes. This Privacy Policy explains what information is
            collected, how it is used, and the choices you have.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">
            2. Information we collect
          </h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <span className="font-semibold">Account information:</span> email
              address and basic profile details when you sign in.
            </li>
            <li>
              <span className="font-semibold">Match data:</span> team numbers,
              events, notes, scores, and other information you enter into the
              app.
            </li>
            <li>
              <span className="font-semibold">Usage data:</span> anonymized or
              aggregated information about how you interact with the app (for
              example, which pages are used most often).
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">
            3. How we use information
          </h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              To provide and improve match recording and analysis features.
            </li>
            <li>
              To maintain your saved matches and statistics across sessions.
            </li>
            <li>To monitor app reliability and understand feature usage.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">
            4. Storage and security
          </h2>
          <p>
            Match data and account information may be stored in cloud databases
            and in your browser&apos;s local storage so that features like "My
            Matches" and lifetime statistics can work. Reasonable safeguards are
            used to protect this data, but no system can be 100% secure.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">
            5. Third-party services
          </h2>
          <p>
            Heronscout uses third-party services such as authentication
            providers and hosting platforms (for example, Github, Firebase or
            Supabase) to manage accounts, store data, and deliver the
            application. These services process data in accordance with their
            own privacy policies.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">6. Analytics</h2>
          <p>
            Heronscout uses analytics tools, such as Firebase Analytics or
            Posthog to collect aggregated information about how the app is used
            (for example, which screens are visited). This helps guide
            improvements and does not include the contents of your match notes.
            Please see the analytics provider&apos;s respective privacy policies
            for more details.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">7. Your choices</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>You can delete match data you no longer want to keep.</li>
            <li>
              You can sign out at any time to stop associating new data with
              your account.
            </li>
            <li>
              You can clear your browser&apos;s local storage to remove locally
              cached data such as filters or recent settings.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">8. Contact</h2>
          <p>
            Contact heronroboticsteam@gmail.com for any privacy related issues
            (bugs, account deletion, etc.)
          </p>
        </section>
      </div>
    </div>
  );
}

export default PrivacyPolicyPage;
