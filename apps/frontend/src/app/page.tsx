import styles from './page.module.css';

export default function Index() {
  /*
   * Replace the elements below with your own.
   *
   * Note: The corresponding styles are in the ./index.css file.
   */
  return (
    <div className={styles.page}>
      <div className="container mx-auto mt-12">
        <div className="container">
          <div id="welcome">
            <h1>
              <span> Hello there, </span>
              Welcome frontend 👋
            </h1>
          </div>

          <div id="commands" className="rounded shadow">
            <h2>Next steps</h2>
            <p>Here are some things you can do with Nx:</p>
          </div>
        </div>
      </div>
    </div>
  );
}
