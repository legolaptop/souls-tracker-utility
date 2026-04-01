export function HelpPage() {
  return (
    <section className="page help-page" aria-labelledby="help-title">
      <h2 id="help-title">Help</h2>
      <p className="page-lead">
        How to use the SOULS Tracker Utility to record, process, and review guild
        scoring events.
      </p>

      <div className="help-toc card">
        <h3>Contents</h3>
        <ol>
          <li>
            <a href="#help-overview">Overview</a>
          </li>
          <li>
            <a href="#help-members">Setting Up Guild Members</a>
          </li>
          <li>
            <a href="#help-events">Registering Events</a>
          </li>
          <li>
            <a href="#help-processing">Processing Score Videos</a>
          </li>
          <li>
            <a href="#help-review">Reviewing & Correcting Records</a>
          </li>
          <li>
            <a href="#help-progress">Tracking Member Progress</a>
          </li>
        </ol>
      </div>

      <article className="help-section" id="help-overview">
        <h3>1. Overview</h3>
        <p>
          SOULS Tracker is a fully client-side utility that runs in your browser. No
          data leaves your device — everything is stored in your browser's local
          storage. Video processing happens via a background worker, so the page
          stays responsive.
        </p>
        <p>
          The typical workflow is: <strong>Add members → Register event → Process
          video → Review records → View progress</strong>.
        </p>
      </article>

      <article className="help-section" id="help-members">
        <h3>2. Setting Up Guild Members</h3>
        <p>
          Go to <strong>Member Setup</strong> and add each guild member with their
          display name. You can add aliases — these are the in-game names that may
          appear in score screenshots. The parser uses aliases to match raw OCR text
          to the correct member.
        </p>
      </article>

      <article className="help-section" id="help-events">
        <h3>3. Registering Events</h3>
        <p>
          Before processing a video, register the scoring session in{' '}
          <strong>Event Setup</strong>. Give it a descriptive label (e.g.,{' '}
          <em>Week 12 – Red Mimic</em>) and the date the footage was recorded. You
          can optionally add notes.
        </p>
      </article>

      <article className="help-section" id="help-processing">
        <h3>4. Processing Score Videos</h3>
        <p>
          In <strong>Score Processing</strong>, select the registered event and the
          mimic colour for that session, then click <strong>Start Processing</strong>.
          The background worker will extract score records from the video frames.
          Progress is shown in real time; you can cancel at any point.
        </p>
        <p>
          Once complete, records are saved automatically and you will be directed to
          the <strong>Review</strong> page.
        </p>
      </article>

      <article className="help-section" id="help-review">
        <h3>5. Reviewing & Correcting Records</h3>
        <p>
          The <strong>Review</strong> page lists all extracted score records. Records
          marked as <em>Unmatched</em> could not be linked to a guild member — go to{' '}
          <strong>Member Setup</strong> and add the missing alias, then re-process or
          manually assign the record.
        </p>
      </article>

      <article className="help-section" id="help-progress">
        <h3>6. Tracking Member Progress</h3>
        <p>
          <strong>Member Progress</strong> shows a summary table of each member's
          total score and participation across all events. Use this to identify
          trends and consistent contributors.
        </p>
      </article>
    </section>
  )
}
