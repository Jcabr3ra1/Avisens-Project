import LoginForm from './components/LoginForm/LoginForm'
import ilustracionGranja from './assets/login-chicken-hd.webp'
import './LoginPage.css'

function LoginPage() {
  return (
    <div className="login-page">
      <main className="login-panel">
        <LoginForm />
      </main>

      <section className="login-visual" aria-hidden="true">
        <img className="login-visual-img" src={ilustracionGranja} alt="" />
      </section>
    </div>
  )
}

export default LoginPage
