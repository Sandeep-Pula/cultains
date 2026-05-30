import {
  AlertTriangle,
  BadgeIndianRupee,
  BarChart3,
  Barcode,
  Boxes,
  CheckCircle2,
  FileText,
  MousePointer2,
  PackagePlus,
  ScanLine,
  Search,
} from 'lucide-react';
import styles from './PublicNarrativeDemo.module.css';

const Metric = ({ label, value }: { label: string; value: string }) => (
  <div className={styles.metric}>
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);

export const PublicNarrativeDemo = () => (
  <section id="demo" className={styles.section} aria-labelledby="narrative-demo-title">
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.eyebrow}>Watch PULA Biz at work</span>
        <h2 id="narrative-demo-title">A shop owner can finish daily tasks without changing apps.</h2>
        <p>
          Follow the cursor through a product setup, barcode scan, GST sale, low-stock alert, and monthly report.
          This silent product animation loops automatically.
        </p>
      </div>

      <div className={styles.demoShell} aria-label="Animated PULA Biz product walkthrough">
        <div className={styles.demoTopbar}>
          <div className={styles.brand}><span>PULA</span><strong>Biz</strong></div>
          <div className={styles.search}><Search size={14} /><span>Search customers, products, invoices...</span></div>
          <div className={styles.demoStatus}><i /> Live workspace</div>
        </div>

        <div className={styles.demoBody}>
          <aside className={styles.sidebar}>
            <div className={styles.sidebarTitle}>Workspace</div>
            <div className={`${styles.navItem} ${styles.navOverview}`}><BarChart3 size={15} /> Overview</div>
            <div className={`${styles.navItem} ${styles.navInventory}`}><Boxes size={15} /> Inventory</div>
            <div className={`${styles.navItem} ${styles.navBarcode}`}><Barcode size={15} /> Barcode desk</div>
            <div className={`${styles.navItem} ${styles.navBilling}`}><BadgeIndianRupee size={15} /> Billing</div>
            <div className={`${styles.navItem} ${styles.navReports}`}><FileText size={15} /> Reports</div>
          </aside>

          <main className={styles.workspace}>
            <div className={`${styles.screen} ${styles.inventoryScreen}`}>
              <div className={styles.screenHeading}>
                <div><span>Inventory</span><h3>Products and stock</h3></div>
                <button className={styles.primaryButton}><PackagePlus size={14} /> Add item</button>
              </div>
              <div className={styles.productTable}>
                <div className={styles.tableHeader}><span>Product</span><span>Variant</span><span>Stock</span><span>Price</span></div>
                <div className={styles.tableRow}><strong>Royal Sandals</strong><span>Brown · 8</span><span>12 pairs</span><span>₹1,499</span></div>
                <div className={styles.tableRow}><strong>Velocity Runner</strong><span>Black · 9</span><span>5 pairs</span><span>₹3,499</span></div>
              </div>
              <div className={`${styles.modal} ${styles.inventoryModal}`}>
                <div className={styles.modalHeading}><strong>Add inventory item</strong><span>New product</span></div>
                <label>Product name<div className={styles.input}><span className={styles.typedName}>Velocity Runner</span></div></label>
                <div className={styles.formGrid}>
                  <label>Size<div className={styles.input}><span className={styles.typedSize}>9</span></div></label>
                  <label>Color<div className={styles.input}><span className={styles.typedColor}>Black</span></div></label>
                </div>
                <label>Selling price<div className={styles.input}><span className={styles.typedPrice}>3499</span></div></label>
                <button className={styles.saveButton}>Save product</button>
              </div>
              <div className={`${styles.toast} ${styles.savedToast}`}><CheckCircle2 size={15} /> Product saved to inventory</div>
            </div>

            <div className={`${styles.screen} ${styles.barcodeScreen}`}>
              <div className={styles.screenHeading}>
                <div><span>Barcode desk</span><h3>Generate and scan labels</h3></div>
                <button className={styles.primaryButton}><Barcode size={14} /> Generate label</button>
              </div>
              <div className={styles.barcodeLayout}>
                <div className={styles.barcodeProduct}>
                  <div className={styles.shoeShape} />
                  <strong>Velocity Runner</strong>
                  <span>Black · Size 9</span>
                </div>
                <div className={styles.barcodeCard}>
                  <div className={styles.barcodeLines}>
                    {Array.from({ length: 22 }, (_, index) => <i key={index} />)}
                  </div>
                  <strong>PULA-VELO-009</strong>
                  <span>Label ready for printing</span>
                </div>
              </div>
              <div className={styles.scanBeam} />
              <div className={`${styles.toast} ${styles.scanToast}`}><ScanLine size={15} /> Barcode scanned · product added to bill</div>
            </div>

            <div className={`${styles.screen} ${styles.billingScreen}`}>
              <div className={styles.screenHeading}>
                <div><span>Billing</span><h3>Current GST invoice</h3></div>
                <span className={styles.invoiceNumber}>INV-2026-338</span>
              </div>
              <div className={styles.billLayout}>
                <div className={styles.billItems}>
                  <div className={styles.billLine}><div><strong>Velocity Runner</strong><span>Black · Size 9 · HSN 6404</span></div><b>₹3,499</b></div>
                  <div className={styles.discountLine}><span>Discount</span><strong>-₹200</strong></div>
                </div>
                <div className={styles.billTotal}>
                  <div><span>Taxable</span><strong>₹3,299</strong></div>
                  <div><span>CGST + SGST</span><strong>₹396</strong></div>
                  <div className={styles.grandTotal}><span>Total</span><strong>₹3,695</strong></div>
                  <button className={styles.invoiceButton}>Generate invoice</button>
                </div>
              </div>
              <div className={`${styles.toast} ${styles.invoiceToast}`}><CheckCircle2 size={15} /> GST invoice generated · paid via UPI</div>
            </div>

            <div className={`${styles.screen} ${styles.overviewScreen}`}>
              <div className={styles.screenHeading}>
                <div><span>Overview</span><h3>Business insights</h3></div>
                <span className={styles.todayLabel}>Today</span>
              </div>
              <div className={styles.metrics}>
                <Metric label="Today's sales" value="₹3,695" />
                <Metric label="Invoices" value="1" />
                <Metric label="Pending payments" value="₹0" />
              </div>
              <div className={styles.alertCard}>
                <AlertTriangle size={18} />
                <div><strong>Velocity Runner is low in stock</strong><span>4 pairs left · minimum stock is 5 pairs</span></div>
                <button>Review stock</button>
              </div>
              <div className={`${styles.toast} ${styles.alertToast}`}><AlertTriangle size={15} /> Low-stock alert created automatically</div>
            </div>

            <div className={`${styles.screen} ${styles.reportScreen}`}>
              <div className={styles.screenHeading}>
                <div><span>Reports</span><h3>Monthly business summary</h3></div>
                <button className={styles.primaryButton}><FileText size={14} /> Export report</button>
              </div>
              <div className={styles.reportGrid}>
                <div className={styles.chartCard}>
                  <span>Sales trend · May 2026</span>
                  <div className={styles.chart}>
                    {[42, 54, 38, 68, 62, 82, 94].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}
                  </div>
                </div>
                <div className={styles.reportStats}>
                  <Metric label="Monthly sales" value="₹2,84,650" />
                  <Metric label="GST collected" value="₹31,880" />
                  <Metric label="Low-stock items" value="4" />
                </div>
              </div>
              <div className={`${styles.toast} ${styles.reportToast}`}><CheckCircle2 size={15} /> Monthly report downloaded</div>
            </div>
          </main>
        </div>

        <div className={styles.captionBar}>
          <span className={styles.captionInventory}>Add inventory with size, color, stock, and price.</span>
          <span className={styles.captionBarcode}>Generate a barcode label and scan it at the counter.</span>
          <span className={styles.captionBilling}>Create a GST invoice in a few clicks.</span>
          <span className={styles.captionAlert}>Receive low-stock alerts automatically.</span>
          <span className={styles.captionReport}>Download monthly insights for better decisions.</span>
        </div>

        <div className={styles.cursor} aria-hidden="true">
          <MousePointer2 size={23} fill="currentColor" />
          <i />
        </div>
      </div>
    </div>
  </section>
);
