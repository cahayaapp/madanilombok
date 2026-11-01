// Compatibility exports only. There is one cashier and one treasury workflow.
// Legacy transaction records remain in finance/cashier_transactions, read by
// the Spark client. All financial writes use the atomic, Rules-validated protocol.
export {renderTreasuryHome as renderFinanceDashboard,renderTreasurySPP as renderBills,renderTreasurySPP as renderPayments,renderTreasuryTopup as renderWallets} from '../treasury/ui.js';
export {renderPOS as renderCashier,renderProducts,renderHistory as renderFinanceHistory,renderReports as renderFinanceReports} from '../minimart/ui.js';
