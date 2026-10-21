import { ButtonLink } from '../components/common/ButtonLink'

/**
 * What the app does with information, in plain words for a parent or a child.
 * Keep this true: `privacy.test.ts` checks the code for anything that would
 * make a claim here false (network calls, cookies, tracking, adverts).
 */
export function PrivacyPage() {
  return (
    <section className="page-section privacy">
      <h1>Privacy</h1>
      <p>
        Math Practice is made to be safe for children. Here is what it does, and
        what it never does.
      </p>

      <h2>What we collect</h2>
      <p>
        Nothing. There are no accounts, names, emails or passwords. Nothing you
        do in the app is sent to us or to anyone else.
      </p>

      <h2>What is saved on this device</h2>
      <p>
        To remember your practice, the app saves these things in this browser:
      </p>
      <ul>
        <li>your settings</li>
        <li>your practice sessions and answers</li>
        <li>your statistics</li>
        <li>the questions you missed</li>
        <li>a bookmark of the session you are in the middle of</li>
      </ul>
      <p>
        They stay on this device, in this browser. They are not shared with
        other devices or other browsers.
      </p>

      <h2>What the app never does</h2>
      <ul>
        <li>It does not track you or count visits.</li>
        <li>It does not use cookies.</li>
        <li>It does not show adverts.</li>
        <li>It does not link to other websites.</li>
        <li>It does not send information anywhere while you practice.</li>
      </ul>
      <p>
        The app is loaded from the website that hosts it. Like any website, that
        host may keep ordinary records of visits, such as the time and the page
        requested. The app itself sends no information back.
      </p>

      <h2>Who can see your progress</h2>
      <p>
        Anyone who uses this browser on this device can open the app and see the
        progress saved in it.
      </p>

      <h2>Clearing your data</h2>
      <p>
        <strong>
          Clearing your browser&apos;s data for this site erases your progress,
          and it cannot be brought back.
        </strong>{' '}
        A private or incognito window forgets everything when it is closed. To
        erase your progress yourself, use <em>Clear All Application Data</em> on
        the Settings page.
      </p>
      <ButtonLink to="/settings" variant="secondary">
        Open Settings
      </ButtonLink>
    </section>
  )
}
