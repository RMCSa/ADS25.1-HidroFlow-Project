// src/components/PlantMonitorPanel.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Paho from 'paho-mqtt';
import styles from './PlantMonitorPanel.module.css'; // Importe seus estilos

interface PlantMonitorPanelProps {
  plantName?: string; // Opcional, para exibir no título
  plantEsp32Identifier: string;
  currentUserRole: string | null | undefined;
}

// Constantes MQTT (podem vir de um arquivo de config ou .env)
const MQTT_BROKER_WEBSOCKET = "wss://broker.emqx.io:8084/mqtt";
const MQTT_CLIENT_ID_WEB_PREFIX = "hidroflow_web_client_";

// Valores de referência para conversão (do seu script original)
const MAX_HUMIDITY_RAW_VALUE = 4095;
const MAX_WATER_LEVEL_RAW_VALUE = 900;


export default function PlantMonitorPanel({ plantName, plantEsp32Identifier, currentUserRole }: PlantMonitorPanelProps) {
  const [waterLevel, setWaterLevel] = useState('N/A %');
  const [humidity, setHumidity] = useState('N/A %');
  const [humidityStateText, setHumidityStateText] = useState('N/A'); // Seco, Úmido, Molhado
  const [pumpStatusText, setPumpStatusText] = useState('N/A'); // Ligada, Desligada
  const [autoModeText, setAutoModeText] = useState('N/A');   // Ativado, Desativado

  const [mqttStatusMessage, setMqttStatusMessage] = useState('Conectando ao Broker MQTT...');
  const [isMqttConnected, setIsMqttConnected] = useState(false);
  const [espStatusMessage, setEspStatusMessage] = useState('Aguardando status do ESP32...');
  const [isEspOnline, setIsEspOnline] = useState<boolean | null>(null); // null para estado inicial/loading

  const clientRef = useRef<Paho.Client | null>(null);
  const isAdmin = currentUserRole === 'admin'; // Simplificação

  useEffect(() => {
    if (!plantEsp32Identifier) {
        setMqttStatusMessage("ID do ESP32 não fornecido.");
        return;
    }

    const uniqueClientId = MQTT_CLIENT_ID_WEB_PREFIX + Math.random().toString(16).substr(2, 8);
    const TOPIC_PREFIX = `hidroflow/${plantEsp32Identifier}`;
    const TOPIC_SUB_DATA = `${TOPIC_PREFIX}/data`;
    const TOPIC_SUB_ESP_STATUS = `${TOPIC_PREFIX}/status`;

    const mqttClient = new Paho.Client(MQTT_BROKER_WEBSOCKET, uniqueClientId);
    clientRef.current = mqttClient;

    mqttClient.onConnectionLost = (responseObject) => {
      if (responseObject.errorCode !== 0) {
        console.log("Conexão MQTT perdida:", responseObject.errorMessage);
        setMqttStatusMessage('Broker Desconectado: ' + responseObject.errorMessage.substring(0,30));
        setIsMqttConnected(false);
        // Tentar reconectar (opcional, adicione lógica mais robusta se necessário)
        // setTimeout(() => mqttClient.connect(connectOptions), 5000);
      }
    };

    mqttClient.onMessageArrived = (message) => {
      const topic = message.destinationName;
      const payload = message.payloadString;
      console.log(`MSG Recebida: ${topic}, ${payload}`);

      try {
        const data = JSON.parse(payload);
        if (topic === TOPIC_SUB_DATA) {
          if (data.water_level !== undefined) {
            const pWL = (parseFloat(data.water_level) / MAX_WATER_LEVEL_RAW_VALUE) * 100;
            setWaterLevel(Math.max(0, Math.min(100, pWL)).toFixed(1) + "%");
          } else { setWaterLevel('N/A %'); }

          if (data.humidity !== undefined) {
            const pH = (parseFloat(data.humidity) / MAX_HUMIDITY_RAW_VALUE) * 100;
            setHumidity(Math.max(0, Math.min(100, pH)).toFixed(1) + "%");
          } else { setHumidity('N/A %'); }

          setHumidityStateText(data.humidity_state || 'N/A');
          setPumpStatusText(data.pump_state || 'N/A');
          setAutoModeText(data.auto_mode || 'N/A');

        }
      } catch (e) {
         if (topic === TOPIC_SUB_ESP_STATUS) { // ESP status pode não ser JSON
            setEspStatusMessage(payload);
            if (payload.toLowerCase().includes("online")) setIsEspOnline(true);
            else if (payload.toLowerCase().includes("offline")) setIsEspOnline(false);
            else setIsEspOnline(null); // Estado incerto ou carregando
         } else {
            console.error("Erro ao processar mensagem MQTT:", e);
         }
      }
    };

    const connectOptions: Paho.ConnectionOptions = {
      onSuccess: () => {
        console.log("MQTT Conectado!");
        setMqttStatusMessage('Broker Conectado');
        setIsMqttConnected(true);
        mqttClient.subscribe(TOPIC_SUB_DATA, { qos: 1 });
        mqttClient.subscribe(TOPIC_SUB_ESP_STATUS, { qos: 1 });
        // Enviar uma mensagem para solicitar o status atual do ESP
        publishCommand("esp/getstatus", "REQUEST_STATUS", true); // true para forçar mesmo se não admin (setup)
      },
      onFailure: (message) => {
        console.log("Falha MQTT:", message.errorMessage);
        setMqttStatusMessage('Falha na conexão MQTT');
        setIsMqttConnected(false);
      },
      useSSL: MQTT_BROKER_WEBSOCKET.startsWith("wss"),
      timeout: 10, // Aumentar timeout
      keepAliveInterval: 60,
      reconnect: true, // Tentar reconectar automaticamente
    };

    console.log(`Conectando ao MQTT com ID: ${uniqueClientId} para ESP: ${plantEsp32Identifier}`);
    mqttClient.connect(connectOptions);

    return () => {
      if (clientRef.current && clientRef.current.isConnected()) {
        console.log("Desconectando MQTT...");
        try {
            clientRef.current.unsubscribe(TOPIC_SUB_DATA);
            clientRef.current.unsubscribe(TOPIC_SUB_ESP_STATUS);
            clientRef.current.disconnect();
        } catch (e) {
            console.error("Erro ao desconectar MQTT:", e);
        }
      }
      clientRef.current = null; // Limpar referência
    };
  }, [plantEsp32Identifier]); // Dependência para reconectar se o ID da planta mudar

  const publishCommand = (commandTopicSuffix: string, payload: string, forcePublish: boolean = false) => {
    if (!isAdmin && !forcePublish) {
      alert("Apenas administradores podem enviar comandos.");
      return;
    }
    if (clientRef.current && clientRef.current.isConnected()) {
      const TOPIC_PUB_COMMAND_BASE = `hidroflow/${plantEsp32Identifier}/commands/`;
      const fullTopic = TOPIC_PUB_COMMAND_BASE + commandTopicSuffix;
      const message = new Paho.Message(payload);
      message.destinationName = fullTopic;
      message.qos = 1; // QoS 1 para garantir entrega
      message.retained = false;
      try {
        clientRef.current.send(message);
        console.log(`Comando enviado: ${fullTopic}, Payload: ${payload}`);
      } catch (e) {
        console.error("Erro ao enviar comando MQTT:", e);
        setMqttStatusMessage("Erro ao enviar comando");
      }
    } else {
      alert("Não conectado ao MQTT. Comando não enviado.");
      console.error("MQTT não conectado. Comando não enviado.");
    }
  };

  // --- Funções de manipulação de classes CSS dinâmicas ---
  const getMqttStatusClass = () => {
      if (!isMqttConnected && mqttStatusMessage.includes('Falha')) return styles.disconnected;
      if (!isMqttConnected && mqttStatusMessage.includes('Conectando')) return styles.loading;
      return isMqttConnected ? styles.connected : styles.disconnected;
  };
  const getEspStatusClass = () => {
      if (isEspOnline === null) return styles.loading;
      return isEspOnline ? styles.connected : styles.disconnected;
  };
  const getSoilMoistureCardClass = () => {
      let base = `${styles.statusItem} `;
      if (humidityStateText.toLowerCase() === 'seco') return base + styles.soilDry;
      if (humidityStateText.toLowerCase() === 'úmido') return base + styles.soilHumid;
      if (humidityStateText.toLowerCase() === 'molhado') return base + styles.soilWet;
      return base;
  };
  const getPumpStatusCardClass = () => {
      let base = `${styles.statusItem} `;
      if (pumpStatusText.toLowerCase() === 'ligada') return base + styles.pumpOn;
      if (pumpStatusText.toLowerCase() === 'desligada') return base + styles.pumpOff;
      return base;
  };
  const getAutoModeCardClass = () => {
    let base = `${styles.statusItem} `;
    if (autoModeText.toLowerCase() === 'ativado') return base + styles.pumpOn; // Reutilizando pumpOn para cor verde
    if (autoModeText.toLowerCase() === 'desativado') return base + styles.pumpOff; // Reutilizando pumpOff para cor vermelha
    return base;
  };


  return (
    <div className={styles.panelContainer}>
      <div className={styles.header}>
        <h1><i className={`fas fa-seedling ${styles.icon}`}></i>HidroFlow{plantName ? ` - ${plantName}`: ''}</h1>
      </div>

      <div className={styles.connectionStatusContainer}>
        <div id="mqttStatus" className={`${styles.statusIndicator} ${getMqttStatusClass()}`}>
          <i className={`fas ${isMqttConnected ? 'fa-check-circle' : 'fa-wifi'}`}></i>
          <span>{mqttStatusMessage}</span>
        </div>
        <div id="espStatus" className={`${styles.statusIndicator} ${getEspStatusClass()}`}>
          <i className={`fas ${isEspOnline === null ? 'fa-spinner fa-spin' : (isEspOnline ? 'fa-check-circle' : 'fa-times-circle')}`}></i>
          <span>{espStatusMessage}</span>
        </div>
      </div>

      <div className={styles.mainContent}>
        <div>
          <h2 className={styles.sectionTitle}>Status dos Sensores</h2>
          <div className={styles.statusGrid}>
            <div className={styles.statusItem}> {/* Nível de Água */}
              <div className={styles.statusItemHeader}>
                <i className={`fas fa-water ${styles.icon}`}></i>
                <strong>Nível de Água:</strong>
              </div>
              <span className={styles.statusValue}>{waterLevel}</span>
            </div>
            <div id="soilMoistureCard" className={getSoilMoistureCardClass()}> {/* Umidade do Solo */}
              <div className={styles.statusItemHeader}>
                <i className={`fas fa-tint ${styles.icon}`}></i>
                <strong>Umidade do Solo:</strong>
              </div>
              <span className={styles.statusValue}>{humidity}</span>
              <div /* className={styles.statusItemSubsection} - Adapte seu CSS se necessário */ >
                 <i className={`fas fa-leaf ${styles.icon}`}></i> {/* Adapte o ícone/estilo */}
                 <span> Estado: {humidityStateText}</span>
              </div>
            </div>
            <div id="pumpStatusItem" className={getPumpStatusCardClass()}> {/* Bomba */}
              <div className={styles.statusItemHeader}>
                <i className={`fas fa-faucet ${styles.icon}`}></i>
                <strong>Bomba:</strong>
              </div>
              <span className={styles.statusValue}>{pumpStatusText}</span>
            </div>
            <div id="autoModeStatusItem" className={getAutoModeCardClass()}> {/* Modo Automático */}
              <div className={styles.statusItemHeader}>
                <i className={`fas fa-robot ${styles.icon}`}></i>
                <strong>Modo Automático:</strong>
              </div>
              <span className={styles.statusValue}>{autoModeText}</span>
            </div>
          </div>
        </div>
        <div>
          <h2 className={styles.sectionTitle}>Controles Manuais & Modo</h2>
          <div className={styles.controls}>
            <div className={styles.controlGroup}>
              <h3><i className="fas fa-cogs"></i> Modo Automático</h3>
              <div className={styles.buttonGroup}>
                <button
                  onClick={() => publishCommand("mode", "AUTO_ON")}
                  className={`${styles.button} ${styles.mode} ${autoModeText === 'Ativado' ? styles.selected : styles.inactive}`}
                  disabled={!isAdmin}
                >
                  <i className="fas fa-brain"></i>LIGAR
                </button>
                <button
                  onClick={() => publishCommand("mode", "AUTO_OFF")}
                  className={`${styles.button} ${styles.mode} ${autoModeText === 'Desativado' ? styles.selected : styles.inactive}`}
                  disabled={!isAdmin}
                >
                  <i className="fas fa-ban"></i>DESLIGAR
                </button>
              </div>
            </div>
            <div className={styles.controlGroup}>
              <h3><i className="fas fa-hand-paper"></i> Bomba de Água (Manual)</h3>
              <div className={styles.buttonGroup}>
                <button
                  onClick={() => publishCommand("pump", "ON")}
                  className={`${styles.button} ${styles.on}`}
                  disabled={!isAdmin || autoModeText === 'Ativado'}
                >
                  <i className="fas fa-power-off"></i>LIGAR
                </button>
                <button
                  onClick={() => publishCommand("pump", "OFF")}
                  className={`${styles.button} ${styles.off}`}
                  disabled={!isAdmin || autoModeText === 'Ativado'}
                >
                  <i className="fas fa-power-off"></i>DESLIGAR
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}