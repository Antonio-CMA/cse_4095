# Math Practice App Spec — Full ChatGPT Transcript

- **Source:** https://chatgpt.com/share/6acc2af2-7d74-83ea-ac67-198b9a8e2f92
- **Shared chat title:** Math Practice App Spec
- **Date of chat:** Wed, Jul 29, 2:29 AM
- **Note:** Transcribed from the shared page. Page chrome (login prompts, navigation) is omitted. Formatting is reconstructed from the page text, and the wording is unchanged.

---

## You said:

Help me come up with a software specification in markdown.
I want to build a Math Practice app for children 7-12 years old with addition, subtraction, division and multiplication operations.
I want to use React.
The practice questions should come in cards which have multiple choice.
There should be a function to flip the cards to reveal the answer.
After flipping, I should have two buttons asking if I got it right or wrong.
Remember which questions I got wrong.
There should be a statistic page to track how many questions attempted, and how many correct vs incorrect answers.

Ask follow-up questions if something is unclear before you start generating the specification.

---

## ChatGPT said:

I’ll clarify the key product decisions first, then turn your answers into a complete Markdown software specification.

**How should difficulty be organized?**

- By age group
- By difficulty levels
- Automatically adaptive
- Parent-selected settings

*Continue*

---

## You said:

> How should difficulty be organized?
> By difficulty levels

> How should wrong questions be handled?
> Generate similar questions

> How should users sign in?
> No account needed

---

## ChatGPT said:

Below is a complete Markdown software specification based on your requirements and answers.

# Math Practice App — Software Specification

## 1. Project Overview

The Math Practice App is a browser-based educational application designed for children ages 7–12. It helps students practice fundamental arithmetic skills through interactive multiple-choice flashcards.

The application will support:

- Addition
- Subtraction
- Multiplication
- Division

Students will answer questions, flip cards to reveal the correct answer, and record whether they answered correctly or incorrectly. The application will remember incorrectly answered questions and generate similar questions for additional practice.

The application will be built using React and will not require users to create an account or sign in.

## 2. Goals

The primary goals of the application are to:

- Provide an easy-to-use math practice experience for children ages 7–12.
- Organize questions into clearly defined difficulty levels.
- Give students immediate feedback after each question.
- Track correct and incorrect answers.
- identify areas where a student needs more practice.
- Generate similar questions based on previously incorrect answers.
- Store progress locally without requiring an account.

## 3. Target Users

### 3.1 Primary User

Children between 7 and 12 years old who want to practice basic arithmetic.

### 3.2 Secondary User

Parents, guardians, or teachers who may review the student's statistics and progress.

## 4. Technology Stack

### 4.1 Frontend

- React
- JavaScript or TypeScript
- HTML5
- CSS3

TypeScript is recommended because it provides stronger type checking and can reduce implementation errors.

### 4.2 State Management

For the initial version, use:

- React Context
- React hooks such as `useState`, `useReducer`, and `useContext`

A third-party state-management library is not required for the first release.

### 4.3 Data Storage

Use browser `localStorage` to store:

- User settings
- Practice history
- Incorrect question patterns
- Statistics
- Current difficulty level

No backend or database is required for the initial version.

### 4.4 Optional Libraries

Possible supporting libraries include:

- React Router for page navigation
- Vitest or Jest for automated testing
- React Testing Library for component testing
- ESLint for code quality
- Prettier for formatting

## 5. Application Pages

The application should contain the following pages:

- Home page
- Practice setup page
- Practice page
- Statistics page
- Settings page

## 6. Functional Requirements

### 6.1 Home Page

The home page should provide a simple introduction and navigation options.

**Required Elements**

- Application title
- Short child-friendly welcome message
- Start Practice button
- View Statistics button
- Settings button

**Example Actions**

- Selecting Start Practice opens the practice setup page.
- Selecting View Statistics opens the statistics page.
- Selecting Settings opens the settings page.

### 6.2 Practice Setup Page

The practice setup page allows the student to configure a practice session.

**Required Settings**

**Operation Selection**

The user must be able to select one or more operations:

- Addition
- Subtraction
- Multiplication
- Division
- Mixed operations

**Difficulty Selection**

Questions should be organized into difficulty levels.

Initial levels:

- Level 1: Beginner
- Level 2: Easy
- Level 3: Intermediate
- Level 4: Advanced

**Session Length**

The user should be able to select the number of questions in a session.

Suggested options:

- 5 questions
- 10 questions
- 20 questions
- Continuous practice

**Review Mode**

The user should be able to select:

- Regular practice
- Practice similar questions from previous mistakes

**Start Session**

The page must include a Start Session button.

The button should remain disabled until at least one operation and one difficulty level are selected.

### 6.3 Practice Page

The practice page is the primary interaction screen.

Each question should be displayed as a card.

**Question Card Front**

The front of the card should display:

- The arithmetic question
- Four multiple-choice answers
- Current question number
- Total number of questions in the session
- Optional progress bar

Example:

```
Question 3 of 10

7 × 8 = ?

[48] [54] [56] [64]
```

**Selecting an Answer**

The user must select one multiple-choice answer before flipping the card.

After the user selects an answer:

- The selected answer should be visually highlighted.
- The Flip Card button should become enabled.
- The answer should not yet be counted as correct or incorrect.

**Flip Card Function**

The card must include a Flip Card button.

When selected, the card should animate and display its back side.

The back of the card should show:

- The original question
- The correct answer
- The answer selected by the student
- A brief explanation when appropriate
- An I Got It Right button
- An I Got It Wrong button

Example:

```
7 × 8 = 56

Your answer: 56

[ I Got It Right ] [ I Got It Wrong ]
```

**Self-Reported Result**

The user will determine whether the question should be recorded as correct or incorrect.

Selecting either button should:

- Record the result.
- Update the session statistics.
- Save the result to local storage.
- Move to the next question.
- Prevent the same question from being counted more than once.

**Next Question**

After the student records the result, the application should automatically show the next card.

An optional short transition may be used.

### 6.4 Similar Question Generation

When a student marks a question as incorrect, the application must remember the question pattern and generate similar questions in future sessions.

**Example**

Original incorrect question:

```
8 × 7
```

Possible similar questions:

```
7 × 8
8 × 6
9 × 7
56 ÷ 7
56 ÷ 8
```

**Stored Mistake Information**

For each incorrect question, store:

- Operation
- First operand
- Second operand
- Correct answer
- Difficulty level
- Date and time
- Number of times answered incorrectly
- Number of similar questions later answered correctly

**Similarity Rules**

Similar questions may be generated using:

- The same operation with nearby numbers
- Reversed operands for addition and multiplication
- Related inverse operations
- The same multiplication or division fact family
- The same difficulty level
- The same numeric range

**Review Priority**

Questions should receive a higher review priority when:

- They have been answered incorrectly multiple times.
- They were answered incorrectly recently.
- Similar questions have not yet been answered correctly.

Questions should receive a lower review priority after the student correctly answers several similar questions.

**Mastery Rule**

A mistake pattern may be considered mastered after the student correctly answers three similar questions.

This number should be configurable in the code.

### 6.5 Session Completion

At the end of a fixed-length practice session, show a session summary.

**Summary Information**

- Total questions attempted
- Correct answers
- Incorrect answers
- Accuracy percentage
- Operations practiced
- Difficulty level
- Number of mistake-review questions completed

**Summary Actions**

- Practice Again
- Practice Mistakes
- Change Settings
- View Statistics
- Return Home

For continuous practice, provide an End Session button.

### 6.6 Statistics Page

The statistics page should display both overall and recent performance.

**Overall Statistics**

Display:

- Total questions attempted
- Total correct answers
- Total incorrect answers
- Overall accuracy percentage

Accuracy should be calculated as:

```
correct answers / total questions attempted × 100
```

If no questions have been attempted, display an accuracy of 0% or an appropriate empty-state message.

**Statistics by Operation**

Display performance separately for:

- Addition
- Subtraction
- Multiplication
- Division

For each operation, show:

- Questions attempted
- Correct answers
- Incorrect answers
- Accuracy percentage

**Statistics by Difficulty**

Display performance for each difficulty level.

For each level, show:

- Questions attempted
- Correct answers
- Incorrect answers
- Accuracy percentage

**Mistake Review Statistics**

Display:

- Number of active mistake patterns
- Number of mastered mistake patterns
- Most frequently missed operation
- Most frequently missed number facts
- Number of similar questions practiced

**Recent Activity**

Display recent sessions with:

- Date
- Operations
- Difficulty
- Questions attempted
- Correct answers
- Incorrect answers
- Accuracy

**Reset Statistics**

The statistics page should include a Reset Statistics button.

Before deleting data, display a confirmation dialog:

```
Are you sure you want to erase all practice history and statistics?
```

The user must explicitly confirm the reset.

### 6.7 Settings Page

The settings page should provide application-wide preferences.

**Suggested Settings**

- Sound effects on or off
- Card animation on or off
- Show explanations on or off
- Default session length
- Default difficulty level
- Default operations
- Number of correct similar questions required for mastery
- Clear all application data

Settings should be stored in `localStorage`.

## 7. Difficulty Levels

The initial difficulty system should use four levels.

### 7.1 Level 1: Beginner

**Addition**

- Numbers from 0 to 10
- Results no greater than 20

**Subtraction**

- Numbers from 0 to 10
- No negative answers

**Multiplication**

- Factors from 0 to 5

**Division**

- Divisors from 1 to 5
- Whole-number answers only

### 7.2 Level 2: Easy

**Addition**

- Numbers from 0 to 50
- Results no greater than 100

**Subtraction**

- Numbers from 0 to 50
- No negative answers

**Multiplication**

- Factors from 0 to 10

**Division**

- Divisors from 1 to 10
- Whole-number answers only

### 7.3 Level 3: Intermediate

**Addition**

- Numbers from 0 to 100
- May include carrying

**Subtraction**

- Numbers from 0 to 100
- May include borrowing
- No negative answers by default

**Multiplication**

- One-digit by one-digit multiplication
- One-digit by two-digit multiplication

**Division**

- Divisors from 1 to 12
- Dividends up to 144
- Whole-number answers only

### 7.4 Level 4: Advanced

**Addition**

- Numbers up to 1,000
- Multiple-digit addition

**Subtraction**

- Numbers up to 1,000
- Multiple-digit subtraction
- Optional negative answers

**Multiplication**

- Two-digit by one-digit multiplication
- Two-digit by two-digit multiplication

**Division**

- Larger dividends
- One-digit or two-digit divisors
- Whole-number answers for the initial release

Questions involving remainders may be added in a future version.

## 8. Question Generation

### 8.1 Question Data Model

Each generated question should have a structure similar to:

```ts
type MathOperation =
  | "addition"
  | "subtraction"
  | "multiplication"
  | "division";

type DifficultyLevel = 1 | 2 | 3 | 4;

interface Question {
  id: string;
  operation: MathOperation;
  firstOperand: number;
  secondOperand: number;
  displayText: string;
  correctAnswer: number;
  choices: number[];
  difficulty: DifficultyLevel;
  source: "regular" | "mistake-review";
  mistakePatternId?: string;
}
```

### 8.2 Multiple-Choice Answers

Each question should contain four answer choices:

- One correct answer
- Three incorrect but plausible answers

**Incorrect Answer Rules**

Incorrect choices should:

- Be unique
- Not equal the correct answer
- Be close enough to be believable
- Match the expected answer type
- Avoid negative values when the level does not allow them

**Example Distractors**

For:

```
8 × 7 = 56
```

Possible choices:

```
48, 54, 56, 64
```

Possible distractor strategies include:

- Add or subtract one operand
- Use a nearby multiplication fact
- Introduce a common arithmetic mistake
- Change the answer by a small amount

**Choice Order**

Answer choices should be randomly shuffled.

The correct answer must not consistently appear in the same position.

## 9. Division Rules

To avoid fractional answers in the initial release, division questions should be generated by first selecting:

- A divisor
- A whole-number quotient

The dividend should then be calculated as:

```
dividend = divisor × quotient
```

Example:

```
divisor = 7
quotient = 8
dividend = 56

Question: 56 ÷ 7
Answer: 8
```

Division by zero must never be generated.

## 10. Data Models

### 10.1 Practice Attempt

```ts
interface PracticeAttempt {
  id: string;
  questionId: string;
  operation: MathOperation;
  firstOperand: number;
  secondOperand: number;
  correctAnswer: number;
  selectedAnswer: number;
  selfReportedCorrect: boolean;
  difficulty: DifficultyLevel;
  source: "regular" | "mistake-review";
  attemptedAt: string;
  sessionId: string;
}
```

### 10.2 Practice Session

```ts
interface PracticeSession {
  id: string;
  startedAt: string;
  completedAt?: string;
  operations: MathOperation[];
  difficulty: DifficultyLevel;
  sessionLength: number | "continuous";
  attempted: number;
  correct: number;
  incorrect: number;
}
```

### 10.3 Mistake Pattern

```ts
interface MistakePattern {
  id: string;
  operation: MathOperation;
  firstOperand: number;
  secondOperand: number;
  correctAnswer: number;
  difficulty: DifficultyLevel;
  incorrectCount: number;
  similarCorrectCount: number;
  lastIncorrectAt: string;
  mastered: boolean;
}
```

### 10.4 Aggregate Statistics

```ts
interface OperationStatistics {
  attempted: number;
  correct: number;
  incorrect: number;
}

interface AppStatistics {
  attempted: number;
  correct: number;
  incorrect: number;
  byOperation: Record<MathOperation, OperationStatistics>;
  byDifficulty: Record<DifficultyLevel, OperationStatistics>;
}
```

## 11. Local Storage Structure

Suggested local-storage keys:

```
mathPractice.settings
mathPractice.sessions
mathPractice.attempts
mathPractice.mistakePatterns
mathPractice.statistics
mathPractice.version
```

**Data Versioning**

Store a schema version so that data can be migrated if the structure changes.

Example:

```json
{
  "version": 1
}
```

**Storage Failure**

If local storage is unavailable or full:

- The current session should continue when possible.
- The application should display a friendly warning.
- The application should not crash.

## 12. Application State

Suggested global state:

```ts
interface AppState {
  settings: AppSettings;
  currentSession: PracticeSession | null;
  currentQuestion: Question | null;
  currentQuestionIndex: number;
  selectedAnswer: number | null;
  isCardFlipped: boolean;
  attempts: PracticeAttempt[];
  mistakePatterns: MistakePattern[];
  statistics: AppStatistics;
}
```

## 13. User Interface Requirements

### 13.1 General Design

The interface should be:

- Bright and welcoming
- Easy to read
- Appropriate for children
- Free from unnecessary distractions
- Usable on tablets, laptops, and desktop computers

### 13.2 Buttons

Buttons should:

- Be large enough for children to select easily
- Use clear labels
- Provide visible hover, focus, and pressed states
- Avoid relying only on icons

### 13.3 Math Card

The question card should:

- Appear near the center of the page
- Have a clear front and back
- Use large text for the math problem
- Animate when flipped
- Remain usable when animations are disabled

### 13.4 Feedback

The application may use child-friendly feedback such as:

- “Great job!”
- “Nice work!”
- “Keep practicing!”
- “You are improving!”

Feedback should not shame or discourage students.

## 14. Accessibility Requirements

The application should follow WCAG accessibility principles.

**Required Accessibility Features**

- Keyboard-accessible controls
- Visible keyboard focus
- Semantic HTML elements
- Proper button labels
- Sufficient text contrast
- Screen-reader-friendly question text
- Alternative behavior when animations are disabled
- Support for the `prefers-reduced-motion` setting
- No information communicated by color alone

**Keyboard Interaction**

Suggested keyboard controls:

- Number keys 1 through 4 select answer choices.
- Enter activates the focused button.
- Space activates buttons and card controls.
- Tab moves between interactive controls.

**Card Flip Accessibility**

The flip animation should not be the only way the answer is revealed.

The card should update appropriate accessibility attributes, such as:

```
aria-expanded="true"
```

or use a live region to announce the revealed answer.

## 15. Responsive Design

The application must support:

- Desktop browsers
- Laptop browsers
- Tablets
- Mobile browsers

The primary design focus should be tablets and larger screens, since children may commonly use tablets for practice.

On small screens:

- Answer choices may appear in a single column.
- Navigation may collapse into a simple menu.
- Statistics tables may become stacked cards.

## 16. Navigation

Use React Router with routes similar to:

```
/
/practice/setup
/practice/session
/practice/summary
/statistics
/settings
```

The application should prevent accidental loss of an active session.

If the user tries to leave an active session, display a confirmation message.

## 17. Error Handling

The application should handle:

- Invalid locally stored data
- Missing session data
- Question-generation failures
- Duplicate multiple-choice answers
- Unsupported storage
- Corrupted statistics
- Unexpected navigation to the practice page

When local data is invalid, the application may reset only the affected section rather than deleting all user data.

## 18. Validation Rules

Before showing a question:

- The operation must be supported.
- The correct answer must be valid.
- Division questions must not divide by zero.
- Division answers must be whole numbers.
- There must be exactly four answer choices.
- All answer choices must be unique.
- One answer choice must equal the correct answer.
- The question must match the selected difficulty level.

Before recording an attempt:

- The user must have selected an answer.
- The card must have been flipped.
- The user must select either correct or incorrect.
- The attempt must not already have been recorded.

## 19. Suggested React Component Structure

```
src/
├── app/
│   ├── App.tsx
│   ├── AppRoutes.tsx
│   └── AppProvider.tsx
├── components/
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Navigation.tsx
│   │   └── PageContainer.tsx
│   ├── practice/
│   │   ├── QuestionCard.tsx
│   │   ├── AnswerChoice.tsx
│   │   ├── CardFront.tsx
│   │   ├── CardBack.tsx
│   │   ├── ProgressBar.tsx
│   │   └── SessionSummary.tsx
│   ├── statistics/
│   │   ├── StatisticsOverview.tsx
│   │   ├── OperationStatistics.tsx
│   │   ├── DifficultyStatistics.tsx
│   │   ├── MistakeStatistics.tsx
│   │   └── RecentSessions.tsx
│   └── common/
│       ├── Button.tsx
│       ├── ConfirmDialog.tsx
│       └── EmptyState.tsx
├── pages/
│   ├── HomePage.tsx
│   ├── PracticeSetupPage.tsx
│   ├── PracticePage.tsx
│   ├── SessionSummaryPage.tsx
│   ├── StatisticsPage.tsx
│   └── SettingsPage.tsx
├── services/
│   ├── questionGenerator.ts
│   ├── similarQuestionGenerator.ts
│   ├── statisticsService.ts
│   └── storageService.ts
├── hooks/
│   ├── usePracticeSession.ts
│   ├── useStatistics.ts
│   └── useLocalStorage.ts
├── types/
│   ├── question.ts
│   ├── session.ts
│   ├── statistics.ts
│   └── settings.ts
└── utils/
    ├── math.ts
    ├── shuffle.ts
    ├── ids.ts
    └── validation.ts
```

## 20. Core Services

### 20.1 Question Generator

Responsibilities:

- Generate questions for a selected operation.
- Apply difficulty-level rules.
- Calculate the correct answer.
- Generate plausible incorrect choices.
- Shuffle answer choices.
- Validate the completed question.

Suggested function:

```ts
function generateQuestion(
  operation: MathOperation,
  difficulty: DifficultyLevel
): Question;
```

### 20.2 Similar Question Generator

Responsibilities:

- Read active mistake patterns.
- Select a mistake based on review priority.
- Generate a related question.
- Avoid repeating the exact same question too often.
- Update mastery progress.

Suggested function:

```ts
function generateSimilarQuestion(
  pattern: MistakePattern
): Question;
```

### 20.3 Statistics Service

Responsibilities:

- Record an attempt.
- Update overall statistics.
- Update operation statistics.
- Update difficulty statistics.
- Calculate accuracy.
- Produce recent-session summaries.

### 20.4 Storage Service

Responsibilities:

- Read data from local storage.
- Write data to local storage.
- Validate stored data.
- Apply schema migrations.
- Clear selected data.
- Clear all data.

## 21. Testing Requirements

### 21.1 Unit Tests

Test:

- Addition question generation
- Subtraction question generation
- Multiplication question generation
- Division question generation
- Difficulty boundaries
- Distractor generation
- Choice uniqueness
- Choice shuffling
- Similar-question generation
- Statistics calculations
- Accuracy calculations
- Mastery rules
- Local-storage serialization

### 21.2 Component Tests

Test:

- Answer selection
- Flip button behavior
- Correct and incorrect buttons
- Card front and back rendering
- Session progress
- Session completion
- Statistics display
- Reset confirmation dialog

### 21.3 Integration Tests

Test complete flows such as:

1. Start a practice session.
2. Select an answer.
3. Flip the card.
4. Mark the answer incorrect.
5. Confirm that statistics update.
6. Confirm that a mistake pattern is stored.
7. Start mistake-review mode.
8. Confirm that a similar question appears.

### 21.4 Edge Cases

Test:

- No stored data
- Corrupted stored data
- Zero attempts
- All answers correct
- All answers incorrect
- Continuous practice
- Browser refresh during a session
- Duplicate distractor generation
- Division by zero prevention
- Very small device widths

## 22. Security and Privacy

Because no account is required, all student data will remain in the browser.

The initial version should:

- Avoid collecting personal information.
- Avoid sending practice history to external services.
- Avoid using third-party analytics that track children.
- Clearly state that clearing browser data may erase progress.
- Avoid advertisements and external links in the child-facing practice interface.

If cloud storage or accounts are added later, additional child privacy requirements may apply.

## 23. Performance Requirements

The application should:

- Load quickly on typical home and school internet connections.
- Generate questions without noticeable delay.
- Animate cards smoothly.
- Avoid unnecessary re-rendering.
- Work with at least several thousand stored attempts.
- Keep local-storage records compact.

Older attempt records may be summarized or archived if storage grows too large.

## 24. Minimum Viable Product

The first release should include:

- Addition, subtraction, multiplication, and division
- Four difficulty levels
- Multiple-choice question cards
- Card-flip functionality
- Self-reported correct and incorrect buttons
- Local tracking of incorrect questions
- Similar-question generation
- Overall statistics
- Statistics by operation
- Statistics by difficulty
- Session summaries
- Local-storage persistence
- Responsive design
- Basic accessibility support

## 25. Future Enhancements

Potential future features include:

- Parent or teacher dashboard
- Multiple child profiles
- Optional user accounts
- Cloud synchronization
- Timed practice mode
- Daily goals
- Practice streaks
- Badges and rewards
- Audio reading of questions
- Visual math explanations
- Fraction practice
- Decimal practice
- Division with remainders
- Custom number ranges
- Printable worksheets
- Classroom mode
- Difficulty that adapts automatically
- Progressive web app support
- Offline installation
- Exportable progress reports

## 26. Acceptance Criteria

The initial release will be considered complete when:

- A user can select one or more arithmetic operations.
- A user can select a difficulty level.
- A user can start a fixed-length or continuous session.
- Each question appears on a multiple-choice card.
- Each question contains four unique answer choices.
- A user can select an answer and flip the card.
- The back of the card reveals the correct answer.
- The user can mark the attempt as correct or incorrect.
- Each attempt is counted exactly once.
- Incorrect questions create or update mistake patterns.
- The application can generate similar questions from mistake patterns.
- Statistics persist after the browser is closed and reopened.
- The statistics page displays attempted, correct, and incorrect totals.
- Statistics can be viewed by operation and difficulty.
- The user can reset stored statistics after confirming the action.
- The application works without an account or backend server.
- The main features work with keyboard navigation.
- The interface functions on desktop, tablet, and mobile screens.

## 27. Assumptions

This specification assumes:

- One child uses a given browser profile.
- Progress is stored only on the current device and browser.
- The child self-reports whether an answer was correct or incorrect.
- Division questions use whole-number answers in the first release.
- Subtraction does not produce negative answers except where explicitly enabled.
- The application is initially delivered as a client-side React application.
- No personally identifiable information is collected.

A useful next step would be to convert this specification into an implementation plan with React components, development milestones, and user stories.

---

## You said:

Take this specification and create a todo list to implement one feature at a time. Order the features from easy to hard. Give it in markdown format.

---

## ChatGPT said:

Here is the implementation checklist, ordered from foundational and easy features to more complex features.

# Math Practice App — Implementation Todo List

## Phase 1: Project Setup

### 1. Create the React Project

- [ ] Create a new React project using Vite.
- [ ] Configure TypeScript.
- [ ] Install project dependencies.
- [ ] Confirm that the development server runs.
- [ ] Remove the default Vite demonstration content.
- [ ] Create the initial application folder structure.

Suggested command:

```bash
npm create vite@latest math-practice-app -- --template react-ts
cd math-practice-app
npm install
npm run dev
```

### 2. Configure Development Tools

- [ ] Configure ESLint.
- [ ] Configure Prettier.
- [ ] Add scripts for linting and formatting.
- [ ] Install Vitest.
- [ ] Install React Testing Library.
- [ ] Create one basic component test.
- [ ] Confirm that tests run successfully.

### 3. Define Shared TypeScript Types

- [ ] Create the `MathOperation` type.
- [ ] Create the `DifficultyLevel` type.
- [ ] Create the `Question` interface.
- [ ] Create the `PracticeAttempt` interface.
- [ ] Create the `PracticeSession` interface.
- [ ] Create the `MistakePattern` interface.
- [ ] Create the statistics interfaces.
- [ ] Create the application settings interface.

Suggested files:

```
src/types/
├── question.ts
├── session.ts
├── statistics.ts
├── mistake.ts
└── settings.ts
```

## Phase 2: Basic Interface

### 4. Create the Shared Page Layout

- [ ] Create a reusable page container.
- [ ] Create the application header.
- [ ] Add the application title.
- [ ] Create a basic navigation component.
- [ ] Add responsive page spacing.
- [ ] Add child-friendly font sizes.
- [ ] Add a consistent button style.

### 5. Create the Home Page

- [ ] Add a welcome message.
- [ ] Add a Start Practice button.
- [ ] Add a View Statistics button.
- [ ] Add a Settings button.
- [ ] Make all buttons keyboard accessible.
- [ ] Add responsive styling for small screens.

### 6. Add Application Routing

- [ ] Install React Router.
- [ ] Create the application routes.
- [ ] Connect the home-page buttons to their routes.
- [ ] Add a fallback page for unknown routes.

Initial routes:

```
/
/practice/setup
/practice/session
/practice/summary
/statistics
/settings
```

## Phase 3: Practice Configuration

### 7. Create the Operation Selector

- [ ] Create an operation-selection component.
- [ ] Add an option for addition.
- [ ] Add an option for subtraction.
- [ ] Add an option for multiplication.
- [ ] Add an option for division.
- [ ] Allow more than one operation to be selected.
- [ ] Add a shortcut for selecting all operations.
- [ ] Visually indicate selected operations.
- [ ] Make operation controls keyboard accessible.

### 8. Create the Difficulty Selector

- [ ] Create four difficulty options.
- [ ] Label them Beginner, Easy, Intermediate, and Advanced.
- [ ] Allow one difficulty level to be selected.
- [ ] Visually indicate the selected level.
- [ ] Add a short description for each level.

### 9. Create the Session-Length Selector

- [ ] Add a 5-question option.
- [ ] Add a 10-question option.
- [ ] Add a 20-question option.
- [ ] Add a continuous-practice option.
- [ ] Set a sensible default session length.

### 10. Build the Practice Setup Page

- [ ] Add the operation selector.
- [ ] Add the difficulty selector.
- [ ] Add the session-length selector.
- [ ] Add a Start Session button.
- [ ] Disable the button when no operation is selected.
- [ ] Display a validation message when necessary.
- [ ] Pass the selected configuration to the practice session.

## Phase 4: Basic Math Question Generation

### 11. Create General Question Utilities

- [ ] Create a random integer utility.
- [ ] Create an array-shuffling utility.
- [ ] Create a unique-ID utility.
- [ ] Add unit tests for each utility.

### 12. Implement Addition Questions

- [ ] Generate two operands.
- [ ] Apply the selected difficulty rules.
- [ ] Calculate the correct answer.
- [ ] Generate the display text.
- [ ] Return a valid `Question` object.
- [ ] Test minimum and maximum operand ranges.
- [ ] Test maximum-result restrictions.

### 13. Implement Subtraction Questions

- [ ] Generate two operands.
- [ ] Prevent negative answers for the initial version.
- [ ] Apply the selected difficulty rules.
- [ ] Calculate the correct answer.
- [ ] Generate the display text.
- [ ] Return a valid `Question` object.
- [ ] Test that the first operand is not smaller than the second.

### 14. Implement Multiplication Questions

- [ ] Generate two factors.
- [ ] Apply the selected difficulty rules.
- [ ] Calculate the correct product.
- [ ] Generate the display text.
- [ ] Return a valid `Question` object.
- [ ] Test factor ranges for every difficulty level.

### 15. Implement Division Questions

- [ ] Generate a nonzero divisor.
- [ ] Generate a whole-number quotient.
- [ ] Calculate the dividend from the divisor and quotient.
- [ ] Apply the selected difficulty rules.
- [ ] Generate the display text.
- [ ] Return a valid `Question` object.
- [ ] Test that division by zero is impossible.
- [ ] Test that all answers are whole numbers.

### 16. Create the Main Question Generator

- [ ] Accept an operation and difficulty level.
- [ ] Call the correct operation-specific generator.
- [ ] Randomly select an operation when multiple operations are enabled.
- [ ] Validate the generated question.
- [ ] Handle unexpected generation failures.
- [ ] Add unit tests for all operations and difficulty levels.

## Phase 5: Multiple-Choice Answers

### 17. Generate Incorrect Answer Choices

- [ ] Generate three incorrect answers.
- [ ] Ensure incorrect answers differ from the correct answer.
- [ ] Ensure all choices are unique.
- [ ] Keep incorrect answers plausible.
- [ ] Avoid negative choices when negative values are not allowed.
- [ ] Prevent fractional choices in whole-number questions.
- [ ] Add a retry limit to prevent infinite loops.

### 18. Add Operation-Specific Distractors

- [ ] Generate nearby-number distractors.
- [ ] Generate addition mistake distractors.
- [ ] Generate subtraction mistake distractors.
- [ ] Generate multiplication-table distractors.
- [ ] Generate division fact-family distractors.
- [ ] Test common edge cases such as answers near zero.

### 19. Shuffle the Answer Choices

- [ ] Combine the correct answer with the distractors.
- [ ] Shuffle all four choices.
- [ ] Confirm that the correct answer appears exactly once.
- [ ] Confirm that the correct answer does not remain in a predictable position.
- [ ] Add automated tests.

## Phase 6: Question Card

### 20. Create the Answer Choice Component

- [ ] Display a single answer choice as a button.
- [ ] Support selected and unselected states.
- [ ] Add hover and focus states.
- [ ] Add a sufficiently large touch target.
- [ ] Add an accessible label.
- [ ] Prevent changes after the card has been flipped.

### 21. Create the Front of the Question Card

- [ ] Display the arithmetic question.
- [ ] Display four answer choices.
- [ ] Display the current question number.
- [ ] Display the total number of questions.
- [ ] Add a Flip Card button.
- [ ] Disable the flip button until an answer is selected.
- [ ] Use large, readable math text.

### 22. Add Answer Selection

- [ ] Store the selected answer in component state.
- [ ] Highlight the selected answer.
- [ ] Allow the selected answer to be changed before flipping.
- [ ] Enable the flip button after selection.
- [ ] Reset the selected answer for each new question.

### 23. Create the Back of the Question Card

- [ ] Display the original question.
- [ ] Display the correct answer.
- [ ] Display the student's selected answer.
- [ ] Add an I Got It Right button.
- [ ] Add an I Got It Wrong button.
- [ ] Prevent both buttons from being selected for the same attempt.

### 24. Add Basic Card-Flipping Behavior

- [ ] Add an `isCardFlipped` state.
- [ ] Show the front before flipping.
- [ ] Show the back after flipping.
- [ ] Prevent answer changes after flipping.
- [ ] Reset the flip state for the next question.
- [ ] Ensure the card works without animation.

### 25. Add the Card-Flip Animation

- [ ] Add a CSS flip animation.
- [ ] Keep the front and back aligned.
- [ ] Prevent mirrored or unreadable card content.
- [ ] Support reduced-motion preferences.
- [ ] Add a setting for disabling animations.

## Phase 7: Practice Session

### 26. Create the Practice Session State

- [ ] Store the session ID.
- [ ] Store the selected operations.
- [ ] Store the selected difficulty.
- [ ] Store the selected session length.
- [ ] Store the current question index.
- [ ] Store session correct and incorrect totals.
- [ ] Store whether the session is active.

### 27. Build the Practice Session Page

- [ ] Read the setup configuration.
- [ ] Generate the first question.
- [ ] Display the question card.
- [ ] Handle missing or invalid setup data.
- [ ] Redirect to the setup page when no valid session exists.

### 28. Record Self-Reported Results

- [ ] Handle the I Got It Right button.
- [ ] Handle the I Got It Wrong button.
- [ ] Increment the session-attempt total.
- [ ] Increment the correct or incorrect total.
- [ ] Prevent duplicate result recording.
- [ ] Store the completed attempt.

### 29. Advance to the Next Question

- [ ] Generate a new question after recording a result.
- [ ] Increment the question number.
- [ ] Reset the selected answer.
- [ ] Reset the card-flip state.
- [ ] Avoid immediately repeating the same question.
- [ ] Add an optional short transition.

### 30. Add Session Progress

- [ ] Display “Question X of Y.”
- [ ] Add a visual progress bar.
- [ ] Update progress after every attempt.
- [ ] Hide fixed progress for continuous practice.
- [ ] Ensure progress is accessible to screen readers.

### 31. Support Continuous Practice

- [ ] Generate questions without a fixed endpoint.
- [ ] Add an End Session button.
- [ ] Confirm before ending when appropriate.
- [ ] Generate a summary after the session ends.

## Phase 8: Session Summary

### 32. Detect Session Completion

- [ ] Compare attempted questions with the selected session length.
- [ ] Stop generating questions when the session is complete.
- [ ] Save the completion timestamp.
- [ ] Navigate to the summary page.

### 33. Create the Session Summary Page

- [ ] Display total questions attempted.
- [ ] Display correct answers.
- [ ] Display incorrect answers.
- [ ] Calculate and display accuracy.
- [ ] Display practiced operations.
- [ ] Display the difficulty level.
- [ ] Display mistake-review question count.

### 34. Add Summary Actions

- [ ] Add a Practice Again button.
- [ ] Add a Practice Mistakes button.
- [ ] Add a Change Settings button.
- [ ] Add a View Statistics button.
- [ ] Add a Return Home button.

## Phase 9: Local Data Storage

### 35. Create the Storage Service

- [ ] Create a wrapper around `localStorage`.
- [ ] Add functions for reading data.
- [ ] Add functions for writing data.
- [ ] Add JSON parsing error handling.
- [ ] Add validation for loaded data.
- [ ] Handle unavailable browser storage.
- [ ] Handle storage-capacity errors.

### 36. Add Data Schema Versioning

- [ ] Store a data-schema version.
- [ ] Detect missing or older versions.
- [ ] Create an initial migration structure.
- [ ] Avoid deleting unrelated stored data.

### 37. Persist Application Settings

- [ ] Save selected settings.
- [ ] Load settings when the application starts.
- [ ] Use defaults when no settings exist.
- [ ] Recover from invalid stored settings.

### 38. Persist Practice Sessions

- [ ] Save session information.
- [ ] Save session completion details.
- [ ] Load recent sessions.
- [ ] Limit or summarize old session records when necessary.

### 39. Persist Practice Attempts

- [ ] Save every completed attempt.
- [ ] Include the selected answer.
- [ ] Include the self-reported result.
- [ ] Include the operation and difficulty.
- [ ] Include the session ID and timestamp.
- [ ] Confirm that attempts persist after a browser restart.

## Phase 10: Statistics

### 40. Implement Statistics Calculations

- [ ] Calculate total attempted questions.
- [ ] Calculate total correct answers.
- [ ] Calculate total incorrect answers.
- [ ] Calculate overall accuracy.
- [ ] Handle zero attempts without dividing by zero.
- [ ] Add unit tests for calculations.

### 41. Track Statistics by Operation

- [ ] Track addition attempts.
- [ ] Track subtraction attempts.
- [ ] Track multiplication attempts.
- [ ] Track division attempts.
- [ ] Calculate accuracy for each operation.

### 42. Track Statistics by Difficulty

- [ ] Track Level 1 performance.
- [ ] Track Level 2 performance.
- [ ] Track Level 3 performance.
- [ ] Track Level 4 performance.
- [ ] Calculate accuracy for each level.

### 43. Create the Statistics Overview

- [ ] Display total attempted questions.
- [ ] Display total correct answers.
- [ ] Display total incorrect answers.
- [ ] Display overall accuracy.
- [ ] Add an empty state for new users.

### 44. Display Statistics by Operation

- [ ] Create one statistics card per operation.
- [ ] Display attempted, correct, and incorrect totals.
- [ ] Display accuracy.
- [ ] Make the layout responsive.

### 45. Display Statistics by Difficulty

- [ ] Create one statistics card per difficulty level.
- [ ] Display attempted, correct, and incorrect totals.
- [ ] Display accuracy.
- [ ] Clearly label each level.

### 46. Display Recent Sessions

- [ ] List recent session dates.
- [ ] Display operations practiced.
- [ ] Display difficulty.
- [ ] Display attempted, correct, and incorrect totals.
- [ ] Display session accuracy.
- [ ] Sort sessions from newest to oldest.
- [ ] Add an empty state when no sessions exist.

### 47. Add Statistics Reset

- [ ] Add a Reset Statistics button.
- [ ] Create a confirmation dialog.
- [ ] Require explicit confirmation.
- [ ] Clear attempts.
- [ ] Clear sessions.
- [ ] Clear aggregate statistics.
- [ ] Decide whether settings should remain unchanged.
- [ ] Refresh the statistics page after deletion.

## Phase 11: Settings

### 48. Create the Settings Page

- [ ] Add a sound-effects setting.
- [ ] Add a card-animation setting.
- [ ] Add a show-explanations setting.
- [ ] Add a default session-length setting.
- [ ] Add a default difficulty setting.
- [ ] Add default operation settings.
- [ ] Save settings automatically or through a save button.

### 49. Apply Default Practice Settings

- [ ] Load default operations on the setup page.
- [ ] Load the default difficulty.
- [ ] Load the default session length.
- [ ] Allow defaults to be changed for an individual session.

### 50. Add Clear-All-Data Functionality

- [ ] Add a Clear All Application Data button.
- [ ] Show a strong confirmation warning.
- [ ] Clear settings, sessions, attempts, and mistake patterns.
- [ ] Restore application defaults.
- [ ] Return the user to the home page.

## Phase 12: Mistake Tracking

### 51. Create Mistake Patterns

- [ ] Create a mistake pattern after an incorrect answer.
- [ ] Store the operation.
- [ ] Store both operands.
- [ ] Store the correct answer.
- [ ] Store the difficulty level.
- [ ] Store the last incorrect date.
- [ ] Initialize the incorrect count.
- [ ] Initialize the similar-correct count.

### 52. Update Existing Mistake Patterns

- [ ] Detect when the same pattern already exists.
- [ ] Increment its incorrect count.
- [ ] Update its last-incorrect timestamp.
- [ ] Reset or reduce mastery progress when appropriate.
- [ ] Avoid creating duplicate pattern records.

### 53. Store Mistake Patterns Locally

- [ ] Save mistake patterns to local storage.
- [ ] Load mistake patterns at application startup.
- [ ] Validate stored mistake-pattern data.
- [ ] Recover gracefully from invalid records.

## Phase 13: Similar Question Generation

### 54. Generate Nearby-Number Questions

- [ ] Create similar questions using nearby operands.
- [ ] Keep questions within the same difficulty range.
- [ ] Avoid invalid subtraction questions.
- [ ] Avoid invalid division questions.
- [ ] Avoid generating the exact same question too frequently.

### 55. Generate Reversed-Operand Questions

- [ ] Reverse addition operands.
- [ ] Reverse multiplication operands.
- [ ] Avoid treating reversed subtraction as equivalent.
- [ ] Avoid treating reversed division as equivalent.

### 56. Generate Fact-Family Questions

- [ ] Generate multiplication questions from division mistakes.
- [ ] Generate division questions from multiplication mistakes.
- [ ] Generate subtraction questions from addition mistakes.
- [ ] Generate addition questions from subtraction mistakes.
- [ ] Ensure generated questions match the selected difficulty.

### 57. Create the Similar Question Generator Service

- [ ] Accept a mistake pattern.
- [ ] Select an appropriate similarity strategy.
- [ ] Generate a valid related question.
- [ ] Label the question as `mistake-review`.
- [ ] Attach the related mistake-pattern ID.
- [ ] Add unit tests for every operation.

## Phase 14: Mistake Review Mode

### 58. Add Review Mode to Practice Setup

- [ ] Add a regular-practice option.
- [ ] Add a mistake-review option.
- [ ] Disable mistake review when no active mistakes exist.
- [ ] Explain why the option is disabled.
- [ ] Display the number of active mistake patterns.

### 59. Prioritize Mistake Patterns

- [ ] Give higher priority to frequently missed patterns.
- [ ] Give higher priority to recently missed patterns.
- [ ] Give higher priority to patterns with little successful review.
- [ ] Randomize patterns with similar priority.
- [ ] Test the prioritization logic.

### 60. Build Mistake Review Sessions

- [ ] Select active mistake patterns.
- [ ] Generate similar questions from those patterns.
- [ ] Mix multiple mistake patterns in one session.
- [ ] Record which pattern produced each question.
- [ ] Display mistake-review counts in the session summary.

### 61. Track Similar-Question Success

- [ ] Increment similar-correct count after a correct review answer.
- [ ] Handle incorrect review answers.
- [ ] Update the original mistake pattern.
- [ ] Store the updated pattern locally.

### 62. Implement Mastery Rules

- [ ] Mark a pattern as mastered after three correct similar questions.
- [ ] Make the mastery threshold configurable.
- [ ] Exclude mastered patterns from normal review.
- [ ] Allow mastered patterns to return after a future mistake.
- [ ] Add tests for mastery transitions.

## Phase 15: Advanced Statistics

### 63. Add Mistake Statistics

- [ ] Display the number of active mistake patterns.
- [ ] Display the number of mastered patterns.
- [ ] Display the number of similar questions practiced.
- [ ] Display the number of review questions answered correctly.

### 64. Identify Frequently Missed Areas

- [ ] Identify the most frequently missed operation.
- [ ] Identify frequently missed number facts.
- [ ] Sort mistake patterns by incorrect count.
- [ ] Handle ties.
- [ ] Add an empty state when there are no mistakes.

### 65. Add Mistake Details

- [ ] Display active mistake patterns.
- [ ] Show incorrect counts.
- [ ] Show mastery progress.
- [ ] Show the most recent incorrect date.
- [ ] Allow mastered patterns to be viewed separately.

## Phase 16: Accessibility

### 66. Improve Keyboard Navigation

- [ ] Ensure every control is reachable with Tab.
- [ ] Add visible focus indicators.
- [ ] Support Enter and Space on buttons.
- [ ] Support number keys 1–4 for answer selection.
- [ ] Prevent keyboard shortcuts from interfering with form inputs.

### 67. Improve Screen-Reader Support

- [ ] Use semantic HTML.
- [ ] Add accessible labels to answer choices.
- [ ] Announce question changes.
- [ ] Announce the revealed correct answer.
- [ ] Announce session progress.
- [ ] Add accessible names to icon buttons.

### 68. Support Reduced Motion

- [ ] Detect `prefers-reduced-motion`.
- [ ] Disable card animations when reduced motion is requested.
- [ ] Ensure card content still changes clearly.
- [ ] Respect the application's animation setting.

### 69. Check Visual Accessibility

- [ ] Verify sufficient color contrast.
- [ ] Avoid communicating results by color alone.
- [ ] Add text or icons to selected states.
- [ ] Test at 200% browser zoom.
- [ ] Test with larger system font sizes.

## Phase 17: Responsive Design and Polish

### 70. Optimize for Tablets

- [ ] Use large touch targets.
- [ ] Center the practice card.
- [ ] Keep answer choices easy to reach.
- [ ] Test portrait and landscape orientations.

### 71. Optimize for Mobile Devices

- [ ] Stack answer choices when necessary.
- [ ] Adjust card width.
- [ ] Prevent horizontal scrolling.
- [ ] Simplify navigation.
- [ ] Test on common small-screen sizes.

### 72. Optimize the Statistics Layout

- [ ] Convert wide tables to cards on small screens.
- [ ] Prevent labels and values from overlapping.
- [ ] Keep recent sessions readable.
- [ ] Support horizontal scrolling only when necessary.

### 73. Add Child-Friendly Feedback

- [ ] Add positive feedback messages.
- [ ] Add supportive messages after mistakes.
- [ ] Avoid shaming language.
- [ ] Randomize feedback without becoming distracting.
- [ ] Add an option to disable feedback effects.

## Phase 18: Session Recovery and Navigation Safety

### 74. Persist an Active Session

- [ ] Save the active session.
- [ ] Save the current question.
- [ ] Save the selected answer when appropriate.
- [ ] Restore the session after a page refresh.
- [ ] Clear restored state when the session ends.

### 75. Protect Against Accidental Navigation

- [ ] Detect attempts to leave an active session.
- [ ] Display a confirmation prompt.
- [ ] Allow the user to continue the session.
- [ ] Allow the user to end and leave the session.
- [ ] Avoid showing warnings after session completion.

## Phase 19: Error Handling

### 76. Handle Invalid Stored Data

- [ ] Detect invalid settings.
- [ ] Detect invalid attempts.
- [ ] Detect invalid sessions.
- [ ] Detect invalid mistake patterns.
- [ ] Reset only the affected data category.
- [ ] Avoid crashing the application.

### 77. Handle Question-Generation Failures

- [ ] Validate every generated question.
- [ ] Retry generation after an invalid result.
- [ ] Set a maximum retry count.
- [ ] Provide a fallback question.
- [ ] Log useful development errors.

### 78. Add User-Friendly Error Messages

- [ ] Add a general error component.
- [ ] Explain storage errors in simple language.
- [ ] Explain missing-session errors.
- [ ] Provide a safe way to return home.
- [ ] Avoid exposing technical stack traces.

## Phase 20: Testing

### 79. Complete Unit Tests

- [ ] Test all arithmetic generators.
- [ ] Test difficulty boundaries.
- [ ] Test distractor generation.
- [ ] Test answer-choice uniqueness.
- [ ] Test statistics calculations.
- [ ] Test mistake-pattern updates.
- [ ] Test similar-question generation.
- [ ] Test mastery rules.
- [ ] Test storage serialization and validation.

### 80. Complete Component Tests

- [ ] Test operation selection.
- [ ] Test difficulty selection.
- [ ] Test answer selection.
- [ ] Test card flipping.
- [ ] Test right and wrong buttons.
- [ ] Test progress updates.
- [ ] Test session completion.
- [ ] Test statistics display.
- [ ] Test confirmation dialogs.

### 81. Complete Integration Tests

- [ ] Test a full addition session.
- [ ] Test a mixed-operation session.
- [ ] Test continuous practice.
- [ ] Test an incorrect answer creating a mistake pattern.
- [ ] Test mistake-review generation.
- [ ] Test mastery completion.
- [ ] Test persistence after a browser refresh.
- [ ] Test resetting statistics.

### 82. Complete Accessibility Testing

- [ ] Complete a session using only the keyboard.
- [ ] Test with a screen reader.
- [ ] Test reduced-motion mode.
- [ ] Test browser zoom.
- [ ] Run an automated accessibility checker.
- [ ] Manually review reported issues.

## Phase 21: Performance and Data Management

### 83. Optimize React Rendering

- [ ] Identify unnecessary component re-renders.
- [ ] Memoize expensive statistics calculations.
- [ ] Keep question generation outside render logic.
- [ ] Avoid unnecessary global state updates.

### 84. Manage Large Practice Histories

- [ ] Test with several thousand attempts.
- [ ] Measure local-storage usage.
- [ ] Limit the number of detailed recent sessions.
- [ ] Summarize older attempt records if necessary.
- [ ] Preserve aggregate statistics when archiving details.

### 85. Improve Loading Performance

- [ ] Measure the initial bundle size.
- [ ] Lazy-load statistics and settings pages.
- [ ] Remove unused dependencies.
- [ ] Optimize fonts and images.
- [ ] Test on slower devices.

## Phase 22: Release Preparation

### 86. Complete Privacy Review

- [ ] Confirm that no personal information is collected.
- [ ] Confirm that practice data remains in the browser.
- [ ] Remove unnecessary tracking services.
- [ ] Avoid child-facing advertisements.
- [ ] Explain that clearing browser data removes progress.

### 87. Complete Browser Testing

- [ ] Test in Chrome.
- [ ] Test in Safari.
- [ ] Test in Firefox.
- [ ] Test in Microsoft Edge.
- [ ] Test on an iPad or tablet emulator.
- [ ] Test on a mobile device or emulator.

### 88. Prepare the Production Build

- [ ] Run all tests.
- [ ] Resolve linting errors.
- [ ] Resolve TypeScript errors.
- [ ] Create the production build.
- [ ] Test the production build locally.
- [ ] Configure deployment routing for React Router.

### 89. Deploy the Application

- [ ] Select a hosting service.
- [ ] Deploy the production build.
- [ ] Verify every route.
- [ ] Verify local-storage persistence.
- [ ] Verify responsive behavior.
- [ ] Verify that no development errors appear in the console.

## Recommended Development Milestones

### Milestone 1: Basic Prototype

Complete Tasks 1–25.

Deliverable:

- The app displays generated math questions.
- Questions have four multiple-choice answers.
- The user can select an answer and flip the card.
- The correct answer is revealed.

### Milestone 2: Functional Practice App

Complete Tasks 26–34.

Deliverable:

- Users can configure and complete practice sessions.
- The app tracks correct and incorrect answers during a session.
- A summary appears after each session.

### Milestone 3: Persistent Statistics

Complete Tasks 35–50.

Deliverable:

- Practice history survives browser restarts.
- Users can view overall, operation, difficulty, and recent-session statistics.
- Users can configure application settings.

### Milestone 4: Personalized Mistake Practice

Complete Tasks 51–65.

Deliverable:

- The app remembers missed questions.
- It generates related questions.
- It prioritizes recurring mistakes.
- It tracks mastery.

### Milestone 5: Production-Ready Application

Complete Tasks 66–89.

Deliverable:

- The app is accessible, responsive, tested, optimized, and deployed.

## Suggested First Implementation Sequence

For the fastest path to a working demonstration, implement these tasks first:

- [ ] Create the React and TypeScript project.
- [ ] Define the question types.
- [ ] Implement addition question generation.
- [ ] Generate four multiple-choice answers.
- [ ] Create the question card front.
- [ ] Add answer selection.
- [ ] Create the card back.
- [ ] Add the flip-card behavior.
- [ ] Add the right and wrong buttons.
- [ ] Generate the next question.
- [ ] Add subtraction.
- [ ] Add multiplication.
- [ ] Add division.
- [ ] Add practice-session totals.
- [ ] Add the session summary.

This produces a usable prototype before adding routing, persistence, advanced statistics, and personalized mistake review.

If you want, I can:

- Add the next phase to the todo list
- Detail implementation tasks for 'Create the Practice Session State'
- Outline testing strategy for practice session and question card features

*ChatGPT is AI and can make mistakes.*
