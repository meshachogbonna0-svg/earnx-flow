/* eslint-disable */
// @ts-nocheck
import { Route as rootRouteImport } from './routes/__root'
import { Route as IndexRouteImport } from './routes/index'
import { Route as ActivateRouteImport } from './routes/activate'
import { Route as ActivateConfirmationRouteImport } from './routes/activate-confirmation'
import { Route as ActivationConfirmationRouteImport } from './routes/activation-confirmation'
import { Route as ActivationProcessingRouteImport } from './routes/activation-processing'
import { Route as AdminRouteImport } from './routes/admin'
import { Route as CongratulationsRouteImport } from './routes/congratulations'
import { Route as DashboardRouteImport } from './routes/dashboard'
import { Route as ForgotPasswordRouteImport } from './routes/forgot-password'
import { Route as LoginRouteImport } from './routes/login'
import { Route as NotificationsRouteImport } from './routes/notifications'
import { Route as PrivacyRouteImport } from './routes/privacy'
import { Route as ProfileRouteImport } from './routes/profile'
import { Route as PromotionsRouteImport } from './routes/promotions'
import { Route as QuestionnaireRouteImport } from './routes/questionnaire'
import { Route as ReferralsRouteImport } from './routes/referrals'
import { Route as RegisterRouteImport } from './routes/register'
import { Route as RequestsRouteImport } from './routes/requests'
import { Route as ResetPasswordRouteImport } from './routes/reset-password'
import { Route as SupportRouteImport } from './routes/support'
import { Route as SurveysRouteImport } from './routes/surveys'
import { Route as TapRouteImport } from './routes/tap'
import { Route as TasksRouteImport } from './routes/tasks'
import { Route as TermsRouteImport } from './routes/terms'
import { Route as TransactionsRouteImport } from './routes/transactions'
import { Route as UpgradeRouteImport } from './routes/upgrade'
import { Route as UpgradeConfirmationRouteImport } from './routes/upgrade-confirmation'
import { Route as UpgradeProcessingRouteImport } from './routes/upgrade-processing'
import { Route as VideosRouteImport } from './routes/videos'
import { Route as WithdrawRouteImport } from './routes/withdraw'
import { Route as WithdrawalConfirmationRouteImport } from './routes/withdrawal-confirmation'
import { Route as WithdrawalProcessingRouteImport } from './routes/withdrawal-processing'
import { Route as UpgradeLevelRouteImport } from './routes/upgrade_.$level'

const route = (source: any, id: string, path: string) => source.update({ id, path, getParentRoute: () => rootRouteImport } as any)
const IndexRoute = route(IndexRouteImport, '/', '/')
const ActivateRoute = route(ActivateRouteImport, '/activate', '/activate')
const ActivateConfirmationRoute = route(ActivateConfirmationRouteImport, '/activate-confirmation', '/activate-confirmation')
const ActivationConfirmationRoute = route(ActivationConfirmationRouteImport, '/activation-confirmation', '/activation-confirmation')
const ActivationProcessingRoute = route(ActivationProcessingRouteImport, '/activation-processing', '/activation-processing')
const AdminRoute = route(AdminRouteImport, '/admin', '/admin')
const CongratulationsRoute = route(CongratulationsRouteImport, '/congratulations', '/congratulations')
const DashboardRoute = route(DashboardRouteImport, '/dashboard', '/dashboard')
const ForgotPasswordRoute = route(ForgotPasswordRouteImport, '/forgot-password', '/forgot-password')
const LoginRoute = route(LoginRouteImport, '/login', '/login')
const NotificationsRoute = route(NotificationsRouteImport, '/notifications', '/notifications')
const PrivacyRoute = route(PrivacyRouteImport, '/privacy', '/privacy')
const ProfileRoute = route(ProfileRouteImport, '/profile', '/profile')
const PromotionsRoute = route(PromotionsRouteImport, '/promotions', '/promotions')
const QuestionnaireRoute = route(QuestionnaireRouteImport, '/questionnaire', '/questionnaire')
const ReferralsRoute = route(ReferralsRouteImport, '/referrals', '/referrals')
const RegisterRoute = route(RegisterRouteImport, '/register', '/register')
const RequestsRoute = route(RequestsRouteImport, '/requests', '/requests')
const ResetPasswordRoute = route(ResetPasswordRouteImport, '/reset-password', '/reset-password')
const SupportRoute = route(SupportRouteImport, '/support', '/support')
const SurveysRoute = route(SurveysRouteImport, '/surveys', '/surveys')
const TapRoute = route(TapRouteImport, '/tap', '/tap')
const TasksRoute = route(TasksRouteImport, '/tasks', '/tasks')
const TermsRoute = route(TermsRouteImport, '/terms', '/terms')
const TransactionsRoute = route(TransactionsRouteImport, '/transactions', '/transactions')
const UpgradeRoute = route(UpgradeRouteImport, '/upgrade', '/upgrade')
const UpgradeConfirmationRoute = route(UpgradeConfirmationRouteImport, '/upgrade-confirmation', '/upgrade-confirmation')
const UpgradeProcessingRoute = route(UpgradeProcessingRouteImport, '/upgrade-processing', '/upgrade-processing')
const VideosRoute = route(VideosRouteImport, '/videos', '/videos')
const WithdrawRoute = route(WithdrawRouteImport, '/withdraw', '/withdraw')
const WithdrawalConfirmationRoute = route(WithdrawalConfirmationRouteImport, '/withdrawal-confirmation', '/withdrawal-confirmation')
const WithdrawalProcessingRoute = route(WithdrawalProcessingRouteImport, '/withdrawal-processing', '/withdrawal-processing')
const UpgradeLevelRoute = route(UpgradeLevelRouteImport, '/upgrade_/$level', '/upgrade/$level')

const rootRouteChildren = { IndexRoute, ActivateRoute, ActivateConfirmationRoute, ActivationConfirmationRoute, ActivationProcessingRoute, AdminRoute, CongratulationsRoute, DashboardRoute, ForgotPasswordRoute, LoginRoute, NotificationsRoute, PrivacyRoute, ProfileRoute, PromotionsRoute, QuestionnaireRoute, ReferralsRoute, RegisterRoute, RequestsRoute, ResetPasswordRoute, SupportRoute, SurveysRoute, TapRoute, TasksRoute, TermsRoute, TransactionsRoute, UpgradeRoute, UpgradeConfirmationRoute, UpgradeProcessingRoute, VideosRoute, WithdrawRoute, WithdrawalConfirmationRoute, WithdrawalProcessingRoute, UpgradeLevelRoute }
export const routeTree = rootRouteImport._addFileChildren(rootRouteChildren)._addFileTypes<any>()
