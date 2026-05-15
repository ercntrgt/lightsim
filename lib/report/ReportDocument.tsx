/* eslint-disable jsx-a11y/alt-text */
// @react-pdf/renderer ile PDF rapor düzeni (sunucu tarafı, Node runtime).

import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import type { Location, Room, SimulationResult } from "@/types";
import { EN_TARGETS, buildRecommendations } from "@/lib/lighting/standards";
import { fmt } from "@/lib/utils";

export interface ReportData {
  fileName: string | null;
  room: Room;
  location: Location;
  result: SimulationResult;
  targetKey: string;
  image?: string; // PNG dataURL (plan + heatmap)
}

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: "#1e293b", lineHeight: 1.5 },
  h1: { fontSize: 22, fontWeight: 700, color: "#b45309" },
  sub: { fontSize: 11, color: "#64748b", marginTop: 4 },
  section: { marginTop: 18 },
  h2: {
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 6,
    borderBottom: "1pt solid #e2e8f0",
    paddingBottom: 3,
  },
  row: { flexDirection: "row", justifyContent: "space-between" },
  cell: {
    width: "48%",
    padding: 8,
    backgroundColor: "#f8fafc",
    borderRadius: 4,
    marginBottom: 6,
  },
  metricLabel: { fontSize: 8, color: "#64748b" },
  metricValue: { fontSize: 16, fontWeight: 700 },
  img: { marginTop: 8, borderRadius: 4 },
  li: { marginBottom: 4 },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 40,
    right: 40,
    fontSize: 7.5,
    color: "#94a3b8",
    borderTop: "1pt solid #e2e8f0",
    paddingTop: 6,
  },
});

export function buildReportElement(d: ReportData) {
  const tgt = EN_TARGETS[d.targetKey] ?? EN_TARGETS.office;
  const r = d.result;
  const tips = buildRecommendations(r, tgt.lux);
  const M = (label: string, value: string) =>
    React.createElement(
      View,
      { style: s.cell },
      React.createElement(Text, { style: s.metricLabel }, label),
      React.createElement(Text, { style: s.metricValue }, value)
    );

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View>
          <Text style={s.h1}>LightSim — Aydınlatma Raporu</Text>
          <Text style={s.sub}>
            Proje: {d.fileName ?? "Adsız"} · Konum: {d.location.label} (
            {d.location.lat}, {d.location.lng}) · Tarih: {d.location.date}{" "}
            {String(Math.floor(d.location.timeMinutes / 60)).padStart(2, "0")}
            :
            {String(d.location.timeMinutes % 60).padStart(2, "0")}
          </Text>
          <Text style={s.sub}>
            Mekân türü (EN 12464-1): {tgt.label} — hedef {tgt.lux} lx · Gök:{" "}
            {d.location.skyModel === "clear"
              ? "Açık (ASHRAE)"
              : "Kapalı (CIE Overcast)"}
          </Text>
        </View>

        <View style={s.section}>
          <Text style={s.h2}>Plan & Lüks Haritası</Text>
          {d.image ? (
            <Image style={s.img} src={d.image} />
          ) : (
            <Text>Görsel sağlanmadı.</Text>
          )}
        </View>

        <View style={s.section}>
          <Text style={s.h2}>Sonuç Metrikleri</Text>
          <View style={[s.row, { flexWrap: "wrap" }]}>
            {M("Ortalama aydınlık", `${fmt(r.avg)} lx`)}
            {M("Min / Max", `${fmt(r.min)} / ${fmt(r.max)} lx`)}
            {M("Düzgünlük Uo (Emin/Eavg)", r.uniformityUo.toFixed(2))}
            {M("U1 (Emin/Emax)", r.uniformityU1.toFixed(2))}
            {M("Daylight Factor", `% ${r.daylightFactorPct.toFixed(1)}`)}
            {M("Lümen yöntemi (çapraz)", `${fmt(r.lumenMethodAvg)} lx`)}
          </View>
          <Text>
            Oda alanı: {fmt(d.room.area, 1)} m² · Hesap noktası:{" "}
            {r.grid.length} · Süre: {r.durationMs} ms ·{" "}
            {r.avg >= tgt.lux
              ? "Aydınlık hedefi karşılanıyor."
              : "Aydınlık hedefin altında."}
          </Text>
        </View>

        <View style={s.section}>
          <Text style={s.h2}>Tavsiyeler</Text>
          {tips.map((t, i) => (
            <Text key={i} style={s.li}>
              • {t}
            </Text>
          ))}
        </View>

        <Text style={s.footer}>
          Aydınlatma hesaplamaları TAHMİNÎDİR; resmi projeler için DIALux /
          Relux / Radiance ile doğrulayın. Referanslar: EN 12464-1 (iç mekân
          aydınlatma), CIE Standart Overcast Sky, ASHRAE Clear Sky.
          LightSim · MIT Lisansı.
        </Text>
      </Page>
    </Document>
  );
}
