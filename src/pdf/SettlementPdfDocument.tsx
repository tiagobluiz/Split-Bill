import {
  Document,
  Page,
  StyleSheet,
  Text,
  View
} from "@react-pdf/renderer";
import { formatPdfMoney, type PdfExportData } from "./buildPdfExportData";

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 10,
    color: "#1D1D1F",
    backgroundColor: "#FFFDFC"
  },
  header: {
    marginBottom: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F2C7BB"
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 6
  },
  subtitle: {
    fontSize: 10,
    color: "#5A5A61"
  },
  section: {
    marginBottom: 18
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 10
  },
  sectionNote: {
    fontSize: 9,
    color: "#6E6E73",
    marginTop: 6
  },
  label: {
    fontSize: 9,
    color: "#6E6E73",
    marginBottom: 3
  },
  inlineValue: {
    fontSize: 12,
    fontWeight: "bold"
  },
  payerCard: {
    borderWidth: 1,
    borderColor: "#F05D3D",
    borderRadius: 10,
    padding: 14,
    backgroundColor: "#FFFFFF",
    marginBottom: 12
  },
  payerName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4
  },
  payerSummary: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#F05D3D"
  },
  owesList: {
    borderWidth: 1,
    borderColor: "#EED7CF",
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#FFFFFF"
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#F3E6E1"
  },
  lastRow: {
    borderBottomWidth: 0
  },
  cell: {
    paddingVertical: 9,
    paddingHorizontal: 10,
    flexGrow: 1
  },
  nameCell: {
    flexBasis: "70%"
  },
  amountCell: {
    flexBasis: "30%",
    textAlign: "right"
  },
  itemCard: {
    borderWidth: 1,
    borderColor: "#EED7CF",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#FFFFFF",
    marginBottom: 10
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6
  },
  itemTitle: {
    fontSize: 12,
    fontWeight: "bold"
  },
  itemMeta: {
    fontSize: 9,
    color: "#6E6E73",
    marginBottom: 8
  },
  shareRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4
  }
});

type Props = {
  data: PdfExportData;
};

export function SettlementPdfDocument({ data }: Props) {
  const nonPayers = data.people.filter((person) => !person.isPayer && person.netCents < 0);

  return (
    <Document
      author="Split-Bill"
      title={`${data.appName} Summary`}
      subject="Grocery bill split summary"
      creator="Split-Bill"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{data.appName}</Text>
          <Text style={styles.subtitle}>Grocery bill split summary</Text>
          <Text style={styles.subtitle}>Exported {data.exportDateLabel}</Text>
          <Text style={styles.subtitle}>Currency {data.currency}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Final settlement</Text>
          <View style={styles.payerCard}>
            <Text style={styles.label}>Payer</Text>
            <Text style={styles.payerName}>{data.payer.name}</Text>
            <Text style={styles.payerSummary}>
              Paid {formatPdfMoney(data.payer.paidCents, data.currency)} - Collect{" "}
              {formatPdfMoney(data.payer.netCents, data.currency)}
            </Text>
          </View>
          <Text style={styles.sectionNote}>
            Total receipt {formatPdfMoney(data.totalCents, data.currency)}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Who owes</Text>
          <View style={styles.owesList}>
            {nonPayers.map((person, index) => (
              <View
                key={person.participantId}
                style={index === nonPayers.length - 1 ? [styles.row, styles.lastRow] : styles.row}
              >
                <Text style={[styles.cell, styles.nameCell]}>{person.name}</Text>
                <Text style={[styles.cell, styles.amountCell]}>
                  {formatPdfMoney(Math.abs(person.netCents), data.currency)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Item breakdown</Text>
          <Text style={styles.sectionNote}>{data.note}</Text>
          {data.items.map((item) => (
            <View key={item.id} style={styles.itemCard} wrap={false}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemTitle}>{item.name}</Text>
                <Text style={styles.itemTitle}>{formatPdfMoney(item.amountCents, data.currency)}</Text>
              </View>
              <Text style={styles.itemMeta}>{item.splitModeLabel}</Text>
              {item.shares.map((share) => (
                <View key={`${item.id}-${share.participantId}`} style={styles.shareRow}>
                  <Text>{share.name}</Text>
                  <Text>{formatPdfMoney(share.amountCents, data.currency)}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}
