# Earn Rewards Daily

EARNX-FINANCE MASTER PROJECT SPECIFICATION



PART 1 – PROJECT OVERVIEW, BRAND IDENTITY, DESIGN SYSTEM & CORE REQUIREMENTS



IMPORTANT



You are a senior Full-Stack Software Engineer, UI/UX Designer, Product Designer, and DevOps Engineer.



You must build this project exactly according to this specification.



This is not a demo, mockup, prototype, landing page only, or UI concept.



Build a complete production-ready web application.



Do not simplify the project.



Do not remove requested features.



Do not replace requested features with your own ideas.



Do not skip any page.



Every page, button, animation, form, API, and database operation must work.



The finished project must be deployable on GitHub and Vercel.



---



PROJECT NAME



EarnX-Finance



This website is a premium mobile-first earning platform where users can complete activities, earn money, invite friends, upgrade accounts, and request withdrawals through a modern fintech-style dashboard.



---



PRIMARY GOAL



Create one of the most premium-looking earning websites available.



It must feel like:



• A modern fintech application

• A premium mobile banking app

• Fast

• Smooth

• Beautiful

• Professional

• Highly responsive



The application must never look cheap.



---



DESIGN STYLE



Use a luxurious fintech design.



Primary Colors



• Dark Navy Blue

• Deep Purple

• Gold

• Black



Accent Colors



• Emerald Green

• White

• Light Gray



Never use bright childish colors.



Maintain a professional appearance.



---



TYPOGRAPHY



Use modern fonts such as:



Poppins



Inter



Manrope



Use bold headings.



Readable body text.



Proper spacing.



Rounded cards.



Rounded buttons.



Glassmorphism where appropriate.



---



MOBILE FIRST



The website must be designed for phones first.



Then scale perfectly for:



Tablet



Laptop



Desktop



Every page must be responsive.



No horizontal scrolling.



---



USER EXPERIENCE



The application must feel alive.



Nothing should feel static.



Scrolling should feel smooth.



Every page should contain beautiful micro-interactions.



Use:



Fade animations



Slide animations



Scale animations



Floating animations



Glass effects



Ripple button effects



Skeleton loading placeholders



Smooth page transitions



Animated counters



Soft shadows



Professional loading screens



Everything should feel polished.



Animations must remain smooth on mobile devices.



---



LANDING PAGE



The landing page must immediately communicate trust.



Sections should include:



Hero Section



Premium headline



Professional description



Call-to-action buttons



Beautiful illustration



Animated background



Navigation Bar



Logo



Home



Features



FAQ



Contact



Login



Register



Hero Buttons



Create Account



Login



Learn More



Statistics Section



Animated counters



Registered users



Successful withdrawals



Daily earnings



Referral rewards



Features Section



Modern cards



Icons



Smooth entrance animations



Referral Section



Explain referral rewards.



How referrals work.



Daily Tasks Section



Explain earning opportunities.



Upgrade Section



Explain account levels.



Testimonials



Professional-looking user reviews.



FAQ



Accordion style.



Smooth open/close animations.



Footer



Privacy Policy



Terms



Support



Contact



Social links



Copyright



---



SCROLL ANIMATIONS



Every section must animate when it enters the screen.



Examples:



Cards slide in.



Text fades upward.



Images move slightly.



Numbers count upward.



Icons rotate gently.



Buttons animate on hover or tap.



Navigation changes after scrolling.



The entire experience should feel premium.



---



LOADING EXPERIENCE



Use beautiful loading screens.



Show skeleton placeholders while data loads.



Avoid blank pages.



Every transition should feel smooth.



---



GENERAL QUALITY REQUIREMENTS



Every page must load quickly.



Code must be clean.



Project must be well organized.



No duplicate code.



Follow best practices.



Maintain scalability.



Optimize for performance.



Build this project to production quality, not demo quality.EARNX-FINANCE MASTER PROJECT SPECIFICATION

PART 2A – USER AUTHENTICATION, EMAIL VERIFICATION & WELCOME BONUS

USER REGISTRATION

The registration page must be modern, elegant, mobile-first, and simple to complete.

The registration form must contain only the following fields:

First Name

Other Names

Username (must be unique)

Email Address (must be unique)

Phone Number

Country (Dropdown)

State/Province (Automatically changes based on selected country)

Password

Confirm Password

Optional Referral Code

Accept Terms & Conditions

The interface must be clean, beautiful, and easy to understand.

Passwords should include a Show/Hide Password button.

Every field must be validated before account creation.

Duplicate usernames or email addresses must never be allowed.

EMAIL VERIFICATION

Immediately after registration:

Save the user account as Pending Verification.

Automatically generate a secure 6-digit verification code.

Send the verification code to the user's email using Resend.

Redirect the user to verify-email.html.

The verification page must simply display:

Enter the 6-digit verification code sent to your email.

Use six separate OTP boxes or one modern OTP input field.

Buttons:

Verify

Resend Code

If the code is correct:

Mark the email as verified.

Redirect the user to the Welcome Survey.

If the code is incorrect:

Display a friendly error message.

Allow another attempt.

The verification process must be simple, clean, and professional.

OPTIONAL WELCOME SURVEY

After successful email verification, redirect the user to welcome.html.

Display the following message:

Complete this optional survey to receive your ₦1,500 Welcome Bonus.

Below it, display:

You may skip this survey, but if you skip it, the welcome bonus will not be credited to your account.

Survey questions:

Age

Country

State/Province

Postal Code

Employment Status

Annual Income Range

How did you hear about EarnX-Finance?

The survey is optional.

If the user submits the survey:

Credit exactly ₦1,500 to the user's account.

Show:

Congratulations! Your ₦1,500 Welcome Bonus has been credited successfully.

Mark the welcome bonus as claimed.

Prevent the bonus from being claimed twice.

If the user skips the survey:

Redirect directly to the Dashboard.

Do not credit the ₦1,500 bonus.

Mark the survey as skipped.

Do not show the survey again unless changed by the system owner.

LOGIN

Allow users to log in using:

Username or

Email Address

Plus:

Password

Include:

Remember Me

Forgot Password

Show Password

If login succeeds:

Redirect the user to the Dashboard.

If login fails:

Display a clean, professional error message.

FORGOT PASSWORD

Allow users to securely reset their password.

Flow:

User enters email address.

Send a password reset code using Resend.

User enters the reset code.

User creates a new password.

User logs in with the new password.

The password reset flow must be secure, simple, and user-friendly.EARNX-FINANCE MASTER PROJECT SPECIFICATION

PART 2B – OFFICIAL DASHBOARD DESIGN, NOTIFICATIONS & SECURITY

OFFICIAL DASHBOARD DESIGN

The dashboard must closely follow the attached dashboard reference image.

Use the attached image as the official dashboard design reference.

Do not redesign the dashboard into another style.

Replace only the content so it matches the EarnX-Finance platform while preserving the premium layout and feel.

THEME

The dashboard must use a luxurious color palette:

Dark Navy Blue

Black

Gold

Purple

Accent colors:

Emerald Green

White

Light Gray

The interface should feel like a premium fintech application.

HEADER

Display:

EarnX-Finance Logo

Notification Bell

User Profile Picture

Greeting based on the time of day

Examples:

Good Morning, Meshach 👋

Good Afternoon, Meshach 👋

Good Evening, Meshach 👋

Display beautiful badges showing:

Current Level

Activation Status

Example:

Level 2 • Premier

Activated ✓

BALANCE CARD

The balance card must be the largest and most important element on the dashboard.

Display:

Total Balance

Available Balance

Hide/Show Balance Eye Icon

Subtle EarnX-Finance watermark/logo in the background

The watermark must never overpower the balance.

When the dashboard loads, animate the balance from ₦0 to the user's actual balance.

QUICK ACTION BUTTONS

Display premium circular buttons for:

Upgrade

Withdraw

Rewards

Tap-to-Earn

History

Referral

Each button must include:

Ripple effect

Glow effect

Smooth press animation

Touch feedback

Premium icon

STATISTICS SECTION

Display animated cards showing:

Today's Earnings

Total Taps

Total Referrals

Current Level

The values must update dynamically from the backend.

REFERRAL BANNER

Display a premium referral banner containing:

Beautiful illustration

Gold accents

Gift box

Coins

"Invite Friends & Earn More" message

Invite Now button

INFORMATION CARDS

Display cards showing:

Battery Percentage

Next Recharge Countdown

Reward Per Tap

Current Level

All values must update automatically from the backend.

BOTTOM NAVIGATION

Include:

Home

Tasks

Tap (large center button)

Promotions

Profile

The Tap button must be:

Larger than the other navigation buttons

Highlighted with a glowing gold effect

The primary focus of the bottom navigation because it is the main earning feature

DASHBOARD ANIMATIONS

The dashboard must never feel static.

Use modern premium animations throughout the application.

Include:

Smooth page transitions

Fade animations

Slide animations

Scale animations

Card entrance animations

Animated counters

Ripple button effects

Skeleton loading placeholders

Floating notification animations

Live countdown timers

Pull-to-refresh

Smooth scrolling

Glassmorphism where appropriate

The application should feel like a premium mobile banking app.

NOTIFICATIONS

Users should receive notifications for:

Registration Success

Email Verification

Welcome Bonus

Referral Rewards

Withdrawal Submitted

Withdrawal Approved

Withdrawal Rejected

Admin Announcements

Promotions

Upgrade Approval

Activation Approval

Unread notifications must display a badge count.

Notifications should support:

Read

Mark All as Read

Delete

Open Details

SECURITY

The application must be built with production-level security.

Requirements:

Secure password hashing

Protected authentication sessions

Role-based access control

Protected routes

Secure API validation

Server-side validation for all sensitive operations

CSRF protection where applicable

Rate limiting for authentication endpoints

Secure handling of verification and reset codes

Never expose sensitive backend data to the frontend.

GENERAL REQUIREMENT

This application is not a demo.

Every page, button, animation, API, database operation, and feature must be fully functional.

Build the project as a production-ready, mobile-first web application that can be deployed directly to GitHub and Vercel.

Do not use placeholder pages or incomplete functionality.

Follow this specification exactly unless a requirement is technically impossible, and preserve the intended user experience throughout.EARNX-FINANCE MASTER PROJECT SPECIFICATION



PART 3A – TAP-TO-EARN, BATTERY SYSTEM & DAILY TASKS



TAP-TO-EARN SYSTEM



The Tap-to-Earn feature is the primary earning method of EarnX-Finance.



The experience must be smooth, addictive, premium, and mobile-friendly.



The interface must never feel static.



Display:



- Current Balance

- Battery Percentage

- Remaining Taps

- Reward Per Tap

- Recharge Countdown

- Current Level

- Daily Tap Progress



---



TAP BUTTON



The Tap button is the most important button in the application.



Requirements:



- Large circular premium button.

- Gold glowing effect.

- 3D appearance.

- Smooth press animation.

- Ripple animation.

- Soft vibration (where supported).

- Floating reward animation.

- Button should slightly follow the user's finger direction when tapped.

- Automatically return to its original position after each tap.



Every tap should display:



+₦Reward



The reward should float upward and disappear smoothly.



The animation must remain smooth even when users tap very quickly.



---



BATTERY SYSTEM



Each tap consumes battery.



Display:



- Battery Percentage

- Recharge Countdown

- Remaining Energy



When battery reaches zero:



Disable tapping.



Display:



Battery Empty



Start the recharge countdown automatically.



The countdown must continue even if the user refreshes the page.



---



BATTERY RECHARGE



Recharge settings must be controlled entirely by the Admin.



The Admin can edit:



- Battery Capacity

- Recharge Time

- Recharge Speed

- Daily Recharge Limit

- Unlimited Battery for selected levels



When fully recharged:



Display:



Battery Fully Recharged



---



TAP REWARD



Every level has its own reward.



Reward values come from the backend.



The Admin can edit:



- Reward Per Tap

- Daily Reward Limit

- Maximum Taps

- Bonus Multipliers



No reward values should be hardcoded.



---



DAILY TAP LIMIT



The Admin can configure:



- Daily Tap Limit

- Daily Earnings Limit

- Unlimited Tapping for Premium Levels



When users reach their daily limit:



Display:



Daily Tap Limit Reached



Show a live countdown until reset.



---



DAILY TASKS



Users earn extra rewards by completing daily tasks.



Example tasks:



- Daily Login

- Watch Videos

- Complete Surveys

- Read Sponsored Articles

- Visit Promotions

- Invite Friends

- Complete Special Events



Each task should display:



- Reward Amount

- Task Description

- Completion Status

- Claim Button



---



TASK REWARDS



After task completion:



Immediately credit the user's balance.



Display a beautiful success animation.



Show:



Reward Successfully Added



Prevent duplicate claims.



---



TASK MANAGEMENT



The Admin can:



- Add Tasks

- Edit Tasks

- Delete Tasks

- Change Rewards

- Set Expiration Dates

- Schedule Automatic Resets



---



USER EXPERIENCE



Every interaction must feel premium.



Include:



- Smooth card animations

- Ripple effects

- Animated balance updates

- Floating rewards

- Live countdown timers

- Skeleton loading

- Pull-to-refresh

- Smooth scrolling

- Glassmorphism



The Tap page should feel like a premium mobile application.EARNX-FINANCE MASTER PROJECT SPECIFICATION



PART 3B – REFERRAL SYSTEM, ACTIVATION, UPGRADE LEVELS, PROMOTIONS & REWARDS



---



REFERRAL SYSTEM



The referral system must be fully automated and connected to the backend.



Every registered user must automatically receive:



- A unique Referral Code

- A unique Referral Link

- A Share button



The user should be able to share their referral link through:



- WhatsApp

- Telegram

- Facebook

- X (Twitter)

- Instagram

- Email

- Copy Link



---



REFERRAL DASHBOARD



Display:



- Total Referrals

- Active Referrals

- Pending Referrals

- Total Referral Earnings

- Referral Bonus Per User

- Referral History



The referral page should include beautiful charts and animated statistics.



---



REFERRAL REWARD



When a referred user completes the required conditions defined by the Admin:



- Credit the referral reward automatically.

- Notify both users.

- Update balances instantly.

- Record the transaction in referral history.



The Admin must be able to change the referral reward amount without editing code.



---



ACCOUNT ACTIVATION



New users may be required to activate their account before accessing certain earning features.



The Admin can enable or disable this requirement.



If activation is required:



Display an Activate Account page.



The user uploads proof of payment (or follows the activation process configured by the Admin).



After submission:



Display:



Activation Request Submitted Successfully



The request enters Pending Review.



---



ACTIVATION STATUS



Possible statuses:



- Not Activated

- Pending Review

- Activated

- Rejected



Activated users receive access to all earning features according to their level.



---



UPGRADE SYSTEM



The application must support 7 upgrade levels.



Each level has:



- Upgrade Price

- Reward Per Tap

- Battery Capacity

- Daily Tap Limit

- Recharge Speed

- Daily Earnings Limit

- Other earning benefits configured by the Admin.



The Admin must be able to edit every level from the Admin Panel without changing code.



---



LEVEL BENEFITS



Each level page should clearly display:



- Upgrade Cost

- Reward Per Tap

- Battery Size

- Daily Earnings Limit

- Recharge Speed

- Premium Benefits



Include a premium Upgrade Now button.



If the user does not have enough balance, display a helpful message explaining what is required.



---



PROMOTIONS



Create a Promotions page where the Admin can publish:



- Weekend Bonuses

- Holiday Events

- Double Reward Campaigns

- Referral Promotions

- Limited-Time Offers



Each promotion should include:



- Title

- Description

- Banner Image

- Start Date

- End Date

- Reward Details



Expired promotions should automatically move to an archive.



---



REWARDS PAGE



Create a dedicated Rewards page showing:



- Welcome Bonus

- Referral Bonuses

- Daily Task Rewards

- Promotional Rewards

- Special Event Rewards

- Loyalty Rewards



Each reward should display:



- Amount

- Date Earned

- Status

- Source



Users should also see their total lifetime rewards.



---



EARNING HISTORY



Every earning activity should automatically be recorded.



Include:



- Date

- Time

- Activity Type

- Amount Earned

- Status



Allow users to search and filter their earning history.



---



LIVE UPDATES



Whenever the user:



- Completes a task

- Receives a referral bonus

- Upgrades their account

- Gets activated

- Claims a reward



The dashboard should update automatically without requiring a page refresh.



Use smooth animations for all updates.



---



ADMIN CONTROL



The Admin must be able to edit from the dashboard:



- Referral Reward Amount

- Activation Requirement

- Upgrade Prices

- Level Benefits

- Reward Per Tap

- Battery Capacity

- Recharge Time

- Daily Tap Limit

- Promotions

- Rewards

- Daily Tasks



The Admin must not be able to change:



- The website name (EarnX-Finance)

- The primary brand colors



The Admin can change:



- Website Logo

- Support Contact Details

- Announcement Banners

- Promotional Images



---



USER EXPERIENCE



The Referral, Upgrade, Rewards, and Promotions pages must all use the same premium design language.



Include:



- Smooth page transitions

- Animated counters

- Fade and slide animations

- Ripple button effects

- Skeleton loading

- Premium illustrations

- Mobile-first responsive design



The experience should feel consistent with a high-end fintech application.ADDITION TO PART 3B – ACTIVATION RULES & ACCOUNT RESTRICTIONS



ACCOUNT ACTIVATION LOGIC



Account activation is optional.



A newly registered user can immediately start using the Tap-to-Earn feature without activating their account.



However, non-activated users have limited access.



---



NON-ACTIVATED USERS



A non-activated user can:



- Register an account

- Verify email

- Complete the Welcome Survey

- Receive the Welcome Bonus (if eligible)

- Access the Dashboard

- Tap to Earn

- Complete Daily Tasks

- Earn Referral Rewards

- View Notifications

- Edit Profile



However, a non-activated user cannot:



- Withdraw earnings

- Upgrade to another level

- Access premium earning features restricted to activated users



The Withdraw and Upgrade buttons must appear locked with a lock icon.



When the user taps either locked button, display a professional popup such as:



«Account Activation Required



Your account must be activated before you can withdraw your earnings or upgrade to a higher level.»



Provide an Activate Account button in the popup.



---



TAP REWARDS



Users should still earn before activation.



Example default values:



- Non-Activated User: ₦15 per tap

- Activated users: Reward Per Tap depends on their current level.



Example:



- Level 1 – Admin Editable

- Level 2 – Admin Editable

- Level 3 – Admin Editable

- Level 4 – Admin Editable

- Level 5 – Admin Editable

- Level 6 – Admin Editable

- Level 7 – Admin Editable



No tap reward values should be hardcoded except the configurable default.



---



ADMIN CONTROL



The Admin must be able to edit:



- Whether account activation is required

- Default reward per tap for non-activated users

- Which features require activation

- Whether withdrawals require activation

- Whether upgrades require activation

- Activation fee (if any)

- Activation instructions

- Activation approval method (automatic or manual)



All these settings must be editable from the Admin Panel without changing the source code.ADDITION TO PART 3B – ACTIVATION FEES, UPGRADE FEES & PAYMENT SETTINGS



ACCOUNT ACTIVATION FEE



The default activation fee should be:



₦10,999



However:



- The activation fee must be editable by the Admin.

- The Admin can increase or decrease the fee at any time.

- Changes should apply automatically throughout the platform.



---



ACTIVATION PAYMENT DETAILS



The Admin must be able to configure:



- Bank Name

- Account Name

- Account Number



The payment details should be displayed on the Activation page.



Example:



Bank Name: [Admin Editable]



Account Name: [Admin Editable]



Account Number: [Admin Editable]



After payment, users can upload proof of payment if manual approval is enabled.



---



ACTIVATION APPROVAL



The Admin can choose:



Manual Approval



User uploads proof of payment.



Admin reviews.



Admin can:



- Approve

- Reject



Automatic Approval



If integrated with a payment gateway in the future, activation can be approved automatically.



---



UPGRADE FEES



All upgrade fees must be editable from the Admin Panel.



Default values:



- Level 1 Upgrade: ₦13,500

- Level 2 Upgrade: ₦17,500

- Level 3 Upgrade: ₦21,500

- Level 4 Upgrade: ₦25,500

- Level 5 Upgrade: ₦29,500

- Level 6 Upgrade: ₦33,500

- Level 7 Upgrade: ₦37,500



The Admin must be able to:



- Change upgrade prices

- Enable or disable upgrades

- Change upgrade benefits

- Change level requirements



without editing code.



---



UPGRADE RESTRICTION



Users cannot upgrade unless:



- Their account is activated.

- They meet any requirements configured by the Admin.



If a non-activated user clicks Upgrade:



Display:



«Account Activation Required



Please activate your account before upgrading to a higher level.»



Provide an Activate Account button.



---



WITHDRAWAL RESTRICTION



Users cannot withdraw unless:



- Their account is activated.



If a non-activated user clicks Withdraw:



Display:



«Account Activation Required



Please activate your account before requesting withdrawals.»



Provide an Activate Account button.



---



ADMIN PAYMENT SETTINGS



The Admin Panel must include a Payment Settings section where the Admin can edit:



- Bank Name

- Account Name

- Account Number

- Activation Fee

- Upgrade Fees

- Payment Instructions

- Activation Approval Method



Changes should take effect immediately throughout the platform.EARNX-FINANCE MASTER PROJECT SPECIFICATION



PART 4 – WITHDRAWALS, HISTORY, SUPPORT, ADMIN PANEL & USER MANAGEMENT



---



WITHDRAWAL SYSTEM



The withdrawal system must be secure, professional, and easy to use.



Only activated users can request withdrawals (unless the Admin changes this rule).



The Admin must be able to configure:



- Minimum withdrawal amount

- Maximum withdrawal amount

- Withdrawal availability (Enable/Disable)

- Processing time

- Supported banks

- Withdrawal instructions



No values should be hardcoded.



---



WITHDRAWAL PAGE



The withdrawal page should display:



- Available Balance

- Withdrawable Balance

- Minimum Withdrawal

- Maximum Withdrawal

- Linked Bank Account



Users must be able to:



- Select Bank

- Enter Account Number

- Verify Account Name automatically (when integrated with a bank verification service in the future)

- Enter Withdrawal Amount

- Enter Withdrawal PIN (optional if enabled by the Admin)



Before submitting:



Display a confirmation dialog:



«Are you sure you want to withdraw ₦XXXX?»



Buttons:



- Confirm

- Cancel



---



WITHDRAWAL PROCESSING



When a withdrawal request is successful:



- Deduct the amount immediately from the user's available balance.

- Save the request in Withdrawal History.

- Set the withdrawal status to Processing.



Redirect the user to withdraw-processing.html.



Display:



Withdrawal Submitted Successfully



Your withdrawal request has been received successfully and is currently being processed.



Please check your bank account within 24 hours.



If you have not received your payment after 24 hours, kindly contact our Support Team.



Buttons:



- Back to Dashboard

- View Withdrawal History

- Contact Support



Display a beautiful success animation.



---



WITHDRAWAL HISTORY



Users should be able to view all withdrawals.



Each record should display:



- Date

- Time

- Amount

- Bank

- Status

- Reference Number



Status options:



- Processing

- Approved

- Rejected

- Completed



Allow users to search and filter their withdrawal history.



---



PROFILE PAGE



Allow users to edit:



- Profile Picture

- First Name

- Other Names

- Phone Number

- Bank Details

- Password

- Withdrawal PIN (if enabled)



Email changes must require verification.



---



SUPPORT CENTER



The Support page should include:



- Live Chat (future integration)

- WhatsApp Support

- Email Support

- Frequently Asked Questions

- Report a Problem

- Contact Form



Users should be able to submit support tickets.



Each ticket should include:



- Subject

- Description

- Screenshot Upload (optional)



Users can track:



- Open Tickets

- Closed Tickets

- Pending Replies



---



ADMIN PANEL



The Admin Panel must have a clean, premium dashboard.



The Admin should be able to manage the entire platform from one place.



---



USER MANAGEMENT



The Admin must be able to:



- View all registered users

- Search by:

  - Username

  - Email

  - Phone Number

  - User ID



The Admin can open any user's account and view it in a secure admin view.



The Admin should be able to see:



- Profile Information

- Dashboard Information

- Current Balance

- Welcome Bonus Status

- Activation Status

- Current Level

- Tap Statistics

- Referral Statistics

- Task History

- Withdrawal History

- Upgrade History

- Notification History

- Last Login

- Account Status



This helps the Admin investigate issues reported by users.



---



ADMIN ACTIONS



The Admin can:



- Edit User Balance

- Activate Accounts

- Reject Activations

- Suspend Accounts

- Unsuspend Accounts

- Ban Users

- Unban Users

- Reset User Passwords

- Send Notifications

- Approve Withdrawals

- Reject Withdrawals

- Complete Withdrawals

- Edit Referral Rewards

- Edit Tap Rewards

- Edit Daily Tasks

- Edit Promotions

- Edit Upgrade Levels

- Edit Activation Fee

- Edit Upgrade Fees

- Edit Bank Details

- Change Website Logo

- Change Support Information



The Admin must not be able to change:



- Website Name (EarnX-Finance)

- Primary Brand Colors



---



ADMIN ACTIVITY LOG



Every admin action must be recorded.



The log should include:



- Admin Name

- Action Performed

- Target User

- Date

- Time

- IP Address (if available)



This provides accountability and security.



---



SYSTEM REQUIREMENTS



Everything must update in real time.



Use modern loading states.



Use smooth animations.EARNX-FINANCE MASTER PROJECT SPECIFICATION



PART 5 – DATABASE, BACKEND, EMAILS, ADMIN SETTINGS, DEPLOYMENT & FINAL REQUIREMENTS



---



DATABASE



Use a production-ready database.



The database should include tables/collections for:



- Users

- Admins

- Email Verification Codes

- Password Reset Codes

- Welcome Survey

- Welcome Bonus

- User Levels

- Account Activation

- Upgrade Levels

- Tap Records

- Battery Data

- Daily Tasks

- Task History

- Rewards

- Referral Records

- Referral Earnings

- Notifications

- Withdrawals

- Bank Accounts

- Promotions

- Support Tickets

- Admin Activity Logs

- Website Settings

- Payment Settings

- System Configuration



The database must be properly indexed for performance.



---



BACKEND



The backend must be fully functional.



Responsibilities include:



- User Authentication

- Email Verification

- Password Reset

- Welcome Bonus Logic

- Survey Processing

- Tap Calculations

- Battery Management

- Referral Rewards

- Upgrade Logic

- Activation Logic

- Withdrawal Requests

- Notifications

- Admin Dashboard

- User Management

- API Security



All API endpoints must validate data before processing.



---



EMAIL SYSTEM



Use Resend as the email service.



Emails must be professionally designed.



Create email templates for:



- Email Verification

- Password Reset

- Welcome Message

- Activation Approved

- Activation Rejected

- Withdrawal Submitted

- Withdrawal Approved

- Withdrawal Rejected

- Upgrade Successful

- Referral Reward

- Admin Announcement



Emails must be mobile responsive.



---



ADMIN SETTINGS



The Admin Panel must include a System Settings page.



The Admin can edit:



- Website Logo

- Activation Fee

- Upgrade Fees

- Default Tap Reward

- Level Rewards

- Battery Capacity

- Recharge Time

- Daily Tap Limit

- Referral Reward

- Welcome Bonus Amount

- Minimum Withdrawal

- Maximum Withdrawal

- Bank Name

- Account Name

- Account Number

- Support Email

- WhatsApp Number

- Social Media Links

- Promotions

- Notification Messages



Changes should apply immediately without editing source code.



---



PERFORMANCE



The application must be optimized.



Requirements:



- Fast page loading

- Lazy loading where appropriate

- Optimized images

- Compressed assets

- Smooth animations

- Efficient database queries

- API response optimization



The application should feel fast even on average mobile devices.



---



SECURITY



Implement production-level security.



Include:



- Secure password hashing

- Authentication middleware

- Authorization middleware

- Input validation

- Rate limiting

- CSRF protection where applicable

- XSS protection

- SQL/NoSQL injection protection

- Secure session management

- Environment variables for secrets



Never expose secret keys in frontend code.



---



ERROR HANDLING



Create beautiful error pages for:



- 404 Page Not Found

- 403 Access Denied

- 500 Server Error

- Network Connection Lost



Each page should provide clear guidance and a button back to the dashboard or homepage.



---



DEPLOYMENT



The project must be fully compatible with:



- GitHub

- Vercel



Provide:



- Clean folder structure

- Environment variable documentation

- Installation instructions

- Build scripts

- Deployment configuration



The project should deploy successfully without major modifications.



---



CODE QUALITY



Write clean, maintainable, scalable code.



Use:



- Modular architecture

- Reusable components

- Clear file organization

- Consistent naming conventions

- Proper comments where necessary



Avoid duplicate code.



---



FINAL INSTRUCTION



This is not a prototype.



This is a complete production-ready mobile-first earning platform.



Every feature described in this specification must be fully implemented.



Do not replace requested features with alternatives.



Do not remove requested functionality.



Do not leave unfinished pages.



Do not use placeholder data except where clearly necessary during initial setup.



The final application should look and behave like a premium fintech mobile application with smooth animations, excellent user experience, modern UI, complete backend functionality, secure authentication, a fully featured Admin Panel, and a production-ready database.



The project must be ready for deployment to GitHub and Vercel.EARNX-FINANCE MASTER PROJECT SPECIFICATION



PART 6 – LANDING PAGE, ANIMATIONS, RESPONSIVENESS & USER EXPERIENCE



---



LANDING PAGE



The landing page is the first impression of EarnX-Finance.



It must immediately communicate:



- Trust

- Professionalism

- Security

- Premium Quality

- Simplicity



The landing page should look like a luxury fintech website, not a gambling or scam website.



---



HERO SECTION



The Hero Section should include:



- EarnX-Finance Logo

- Professional Navigation Bar

- Large Headline

- Attractive Subheading

- "Create Account" Button

- "Login" Button

- Beautiful Hero Illustration



Background:



- Animated gradient

- Floating glowing shapes

- Premium lighting effects



---



NAVIGATION BAR



Display:



- Home

- Features

- How It Works

- Rewards

- FAQ

- Contact

- Login

- Register



The navigation bar should become slightly transparent with a blur effect while scrolling.



---



HOW IT WORKS



Show four beautiful cards:



Step 1



Create Your Free Account



↓



Step 2



Verify Your Email



↓



Step 3



Start Earning Instantly



↓



Step 4



Activate Your Account To Unlock Withdrawals & Upgrades



Each card should animate into view as the user scrolls.



---



FEATURES SECTION



Display premium feature cards.



Features include:



- Tap-to-Earn

- Daily Tasks

- Referral Rewards

- Secure Withdrawals

- Fast Dashboard

- Premium User Experience

- Professional Support

- Mobile Friendly



Each card should include:



- Premium Icon

- Title

- Description

- Smooth hover animation



---



LIVE STATISTICS



Display animated counters:



- Registered Users

- Total Withdrawals

- Total Rewards Paid

- Active Users Today

- Successful Referrals



The counters should animate from zero when visible.



---



TESTIMONIALS



Display beautiful testimonial cards.



Each card includes:



- User Photo

- User Name

- Country

- Review

- Star Rating



Cards should slide automatically.



---



FAQ



Create an accordion FAQ.



Example questions:



- How do I earn?

- Is activation compulsory?

- How do I withdraw?

- How do referrals work?

- How long do withdrawals take?

- How do I contact support?



Answers should expand smoothly.



---



CONTACT SECTION



Display:



- WhatsApp

- Email

- Support Form

- Business Hours



---



FOOTER



Include:



- About Us

- Terms & Conditions

- Privacy Policy

- Contact

- Support

- Social Media Links

- Copyright



---



ANIMATIONS



The website must never feel static.



Use:



- Fade In

- Slide Left

- Slide Right

- Zoom

- Floating Effects

- Ripple Effects

- Button Hover Effects

- Smooth Page Transitions

- Skeleton Loading

- Animated Numbers

- Scroll Reveal Animations



Elements should animate only when they enter the screen.



---



MOBILE RESPONSIVENESS



The website must be designed for phones first.



It must work perfectly on:



- Android

- iPhone

- Tablets

- Laptops

- Desktop



There must never be horizontal scrolling.



---



ACCESSIBILITY



The application should be accessible.



Include:



- Proper button sizes

- Readable fonts

- Keyboard navigation where applicable

- Good color contrast

- Accessible labels for forms



---



FINAL USER EXPERIENCE



The finished platform should feel like a premium banking application with earning features.



Every page should load quickly.



Every animation should feel smooth.EARNX-FINANCE MASTER PROJECT SPECIFICATION



PART 7 – PROJECT STRUCTURE, PAGES, FILES & TECHNOLOGY STACK



---



PROJECT GOAL



Build a production-ready, mobile-first, full-stack earning platform called EarnX-Finance.



The project must include a complete frontend, backend, database, admin panel, authentication system, email verification, and deployment configuration.



Do not create placeholder pages.



Every page must work.



---



REQUIRED TECHNOLOGY STACK



Frontend:



- Next.js (App Router)

- React

- TypeScript

- Tailwind CSS

- Framer Motion (animations)



Backend:



- Next.js API Routes or equivalent server-side implementation



Database:



- Supabase (PostgreSQL)



Authentication:



- Secure email/password authentication



Email Service:



- Resend



Deployment:



- GitHub

- Vercel



---



REQUIRED PROJECT STRUCTURE



Create a clean and organized project structure.



Example:



app/

components/

lib/

hooks/

services/

styles/

public/

public/images/

public/icons/

public/logo/

api/

database/

utils/



The codebase should be modular and scalable.



---



REQUIRED PAGES



Public Pages



- Home

- Login

- Register

- Verify Email

- Forgot Password

- Reset Password

- Welcome Survey

- FAQ

- Contact

- Privacy Policy

- Terms & Conditions



---



User Dashboard Pages



- Dashboard

- Tap-to-Earn

- Daily Tasks

- Rewards

- Referral

- Withdraw

- Withdrawal Processing

- Withdrawal History

- Transaction History

- Notifications

- Promotions

- Upgrade

- Level 1

- Level 2

- Level 3

- Level 4

- Level 5

- Level 6

- Level 7

- Activation

- Activation Upload

- Profile

- Settings

- Support



---



Admin Pages



- Admin Login

- Admin Dashboard

- User Management

- Activation Requests

- Withdrawals

- Upgrade Management

- Rewards Management

- Referral Management

- Task Management

- Promotions Management

- Notification Management

- Support Tickets

- Payment Settings

- Website Settings

- Analytics Dashboard

- Admin Activity Logs

- System Settings



---



REQUIRED COMPONENTS



Create reusable components including:



- Navbar

- Footer

- Sidebar

- Bottom Navigation

- Balance Card

- User Card

- Statistic Card

- Referral Banner

- Battery Widget

- Countdown Timer

- Notification Dropdown

- Loading Skeleton

- Success Modal

- Confirmation Dialog

- Toast Notifications

- OTP Input Component

- Profile Avatar

- Premium Buttons



---



REQUIRED DATABASE TABLES



Create all necessary database tables, relationships, indexes, and constraints for:



- Users

- Admins

- User Profiles

- Levels

- Activation Requests

- Tap Records

- Battery Status

- Tasks

- Task History

- Rewards

- Referrals

- Referral Earnings

- Notifications

- Withdrawals

- Transactions

- Promotions

- Support Tickets

- Email Verification Codes

- Password Reset Codes

- Website Settings

- Payment Settings

- Admin Logs



Design the schema with proper foreign keys and scalability.



---



REQUIRED APIs



Implement secure backend APIs for:



- Authentication

- Registration

- Login

- Logout

- Email Verification

- Password Reset

- Welcome Survey

- Dashboard Data

- Tap Submission

- Battery Updates

- Referral Tracking

- Rewards

- Daily Tasks

- Withdrawals

- Upgrade Requests

- Activation Requests

- Notifications

- User Profile

- Admin Dashboard

- Admin User Management

- System Settings



All APIs must include proper validation, authentication, authorization, and error handling.



---



FINAL DEVELOPMENT RULES



- Build everything as production-ready.

- Do not leave unfinished pages.

- Do not use placeholder buttons.

- Every form must connect to the backend.

- Every button must perform its intended action.

- Follow this specification exactly.

- Prioritize security, responsiveness, maintainability, and performance.



The final result should feel like a premium fintech application rather than a simple website.



Every button should provide immediate feedback.



Users should enjoy using the platform and find it simple to navigate.



Use responsive layouts.



Every button, form, page, and feature must work correctly.EARNX-FINANCE MASTER PROJECT SPECIFICATION



PART 8 – FINAL AI INSTRUCTIONS, CODE STANDARDS & DEPLOYMENT REQUIREMENTS



---



MASTER INSTRUCTION TO THE AI



Build EarnX-Finance exactly according to this specification.



Do not simplify, remove, replace, or redesign features unless absolutely necessary for technical reasons.



The attached dashboard reference image is the official UI/UX reference. Match its premium mobile design, spacing, layout, visual hierarchy, colors, and overall feel while replacing its content with the EarnX-Finance features described in this document.



---



PRODUCTION-READY REQUIREMENT



This project is not a demo.



It must be a complete production-ready web application.



Everything must work correctly, including:



- Registration

- Login

- Email Verification

- Welcome Survey

- Dashboard

- Tap-to-Earn

- Daily Tasks

- Referral System

- Rewards

- Activation

- Upgrade Levels

- Withdrawals

- Notifications

- User Profile

- Admin Panel

- Support System



No placeholder pages or fake functionality.



---



CLEAN CODE



Write clean, scalable, and maintainable code.



Requirements:



- Modular components

- Reusable functions

- Proper folder organization

- Consistent naming conventions

- Proper error handling

- Strong input validation

- Clear comments where appropriate



Avoid duplicate code.



---



MOBILE-FIRST DESIGN



The application must be designed for mobile devices first.



The mobile experience is the highest priority.



The UI should still adapt beautifully to tablets, laptops, and desktops.



---



PERFORMANCE



Optimize for:



- Fast loading

- Smooth animations

- Efficient API calls

- Optimized database queries

- Image optimization

- Lazy loading where appropriate



The application should feel fast even on lower-end Android devices.



---



SECURITY



Protect the application using industry best practices.



Include:



- Secure password hashing

- Authentication middleware

- Authorization middleware

- Input validation

- Rate limiting

- Secure session management

- Environment variables for secrets

- API protection

- Secure Admin authentication



Never expose secret keys in frontend code.



---



GITHUB



Generate the project ready for GitHub.



Include:



- README.md

- .gitignore

- Environment variable example (.env.example)

- Installation instructions



The repository should be clean and organized.



---



VERCEL



The project must deploy successfully on Vercel without major modifications.



Configure:



- Build settings

- Environment variables

- Production configuration



---



FINAL QUALITY CHECK



Before considering the project complete, verify that:



- Every page works.

- Every button performs its intended action.

- Every form connects to the backend.

- Every animation works smoothly.

- Every API endpoint is functional.

- Every Admin feature works.

- The database is correctly connected.

- Emails are sent successfully through Resend.

- The application is responsive.

- No console errors remain.

- No placeholder text or dummy pages remain.



---



FINAL GOAL



The finished product should look and feel like a premium, modern fintech application with earning features.



Users should enjoy using the platform because it is:



- Beautiful

- Fast

- Secure

- Professional

- Easy to navigate

- Mobile-first

- Production-ready



The completed application must be ready for deployment to GitHub and Vercel with minimal additional configuration.EARNX-FINANCE MASTER PROJECT SPECIFICATION



PART 9 – FINAL REQUIREMENTS, FUTURE EXPANSION & PROJECT COMPLETION



---



FINAL MASTER INSTRUCTION



This specification is the official blueprint for the EarnX-Finance platform.



The AI must implement every feature described throughout Parts 1–9 unless it is technically impossible.



Do not replace requested functionality with simpler alternatives.



---



ADMIN OWNERSHIP



The Admin is the owner of the platform.



The Admin must have complete control over platform settings from the Admin Panel without editing source code.



The Admin can edit:



- Website Logo

- Bank Name

- Account Name

- Account Number

- Activation Fee

- Upgrade Fees

- Reward Per Tap

- Non-Activated User Reward

- Battery Capacity

- Recharge Time

- Daily Tap Limits

- Referral Rewards

- Welcome Bonus Amount

- Minimum Withdrawal

- Maximum Withdrawal

- Promotions

- Daily Tasks

- Notification Messages

- Support Contact Information

- Social Media Links

- Website Banners



The Admin must not be able to change:



- Website Name (EarnX-Finance)

- Primary Brand Identity and Color Palette



---



FUTURE EXPANSION



The system should be built so new features can easily be added later, including:



- Payment gateway integration

- Automatic bank account verification

- Push notifications

- Mobile app (Android/iOS)

- Cryptocurrency rewards

- Leaderboards

- Loyalty program

- Spin-to-Win events

- Seasonal events

- AI-powered customer support

- Multiple admin roles



The codebase should be modular to support these additions.



---



DESIGN CONSISTENCY



Every page should follow the same premium design language.



Use consistent:



- Colors

- Typography

- Icons

- Card styles

- Button styles

- Animations

- Spacing







---



TESTING



Before deployment, verify:



- Registration works

- Email verification works

- Password reset works

- Welcome survey works

- Welcome bonus is credited correctly

- Tap-to-Earn works

- Battery system works

- Daily tasks work

- Referral rewards work

- Activation flow works

- Upgrade system works

- Withdrawals work

- Notifications work

- Admin Panel works

- Support system works

- All database operations work correctly



---



ERROR PREVENTION



The application should gracefully handle:



- Invalid form input

- Duplicate usernames or emails

- Expired verification codes

- Expired password reset codes

- Failed email delivery

- Slow internet connections

- Server errors

- Unauthorized access

- Network interruptions



Display clear, friendly error messages to users.



---



FINAL USER EXPERIENCE



The platform should feel:



- Fast

- Secure

- Modern

- Luxurious

- Professional

- Trustworthy

- Smooth on mobile devices



Every interaction should provide immediate visual feedback.



Animations should enhance the experience without reducing performance.



---



PROJECT DELIVERY



Deliver the complete project with:



- Fully functional frontend

- Fully functional backend

- Configured database

- Complete Admin Panel

- Email integration using Resend

- Clean GitHub-ready project

- Vercel-ready deployment

- Responsive mobile-first UI

- Production-ready code



No unfinished pages.



No placeholder functionality.



No missing backend connections.



---



FINAL AI COMMAND



Build EarnX-Finance exactly as described in Parts 1–9.



Produce a complete, secure, scalable, production-ready application that is ready for deployment and future growth.



This specification takes priority over any default assumptions. When in doubt, follow this document rather than inventing new features or removing existing ones.EARNX-FINANCE MASTER PROJECT SPECIFICATION



PART 10 – NON-NEGOTIABLE DEVELOPMENT RULES



---



IMPORTANT



This document overrides the AI's default decisions.



If there is any conflict between the AI's assumptions and this specification, this specification must always take priority.



---



DO NOT SIMPLIFY



Do NOT remove any requested feature.



Do NOT redesign the dashboard.



Do NOT replace requested functionality with placeholders.



Do NOT use fake data except during initial development.



---



DASHBOARD



Use the attached dashboard reference image as the official design inspiration.



Match:



- Layout

- Colors

- Card styles

- Icons

- Navigation

- Animations

- Premium appearance



Only replace the content so it matches EarnX-Finance.



---



ADMIN PANEL



The Admin Panel must be fully functional.



Every setting editable by the Admin must immediately affect the website without editing source code.



---



USER EXPERIENCE



Every page must include:



- Smooth animations

- Premium loading screens

- Success messages

- Error messages

- Mobile responsiveness

- Touch feedback

- Beautiful transition



---



PERFORMANCE



Target:



- Fast loading

- Smooth scrolling

- Responsive UI

- Optimized database queries

- Efficient backend APIs



---



SECURITY



Never expose:



- Secret Keys

- Database Credentials

- Admin Credentials

- Environment Variables



Always validate user input on the server.



Protect all Admin routes.



---



CODE QUALITY



Generate production-quality code.



The code should be:



- Modular

- Scalable

- Maintainable

- Well organized

- Easy to understand



---



TEST BEFORE COMPLETION



Before considering the project complete, verify:



✓ Registration works.



✓ Email verification works.



✓ Welcome survey works.



✓ Welcome bonus works.



✓ Tap-to-Earn works.



✓ Battery system works.



✓ Daily tasks work.



✓ Referral system works.



✓ Activation works.



✓ Upgrade system works.



✓ Withdrawals work.



✓ Notifications work.



✓ Support works.



✓ Admin Panel works.



✓ Database works.



✓ Emails work.



✓ Mobile responsiveness works.



✓ Deployment works.



---



FINAL GOAL



Build a complete production-ready platform called EarnX-Finance.

It should be ready for deployment on GitHub and Vercel with minimal additional configuration.



Do not finish the project until every requirement in Parts 1–10 has been implemented successfully.



Do not leave placeholder pages.



Build everything to production quality.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/25c531cd-c0db-43a9-ae8a-1cd602294eb1).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
