# Questionnaire choice-answer fix

The questionnaire UI now converts recognised survey questions into selectable answers when the database question does not contain usable options.

Examples include:
- How much do you earn monthly?
- Annual income range
- Employment status
- Age
- Country
- State/Province
- How did you hear about EarnX?
- Gender
- Marital status
- Education
- Yes/No employment questions

Postal code, residential address, and other unrecognised free-form questions remain text inputs.

Existing database-provided options still take priority for questions that are not recognised by the built-in mapping.

The registration welcome-bonus subtitle now reads the configured `platform_settings.welcome_bonus` value instead of displaying a hard-coded ₦1,500.
